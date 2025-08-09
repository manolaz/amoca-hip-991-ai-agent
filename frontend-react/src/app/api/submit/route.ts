import { NextRequest } from 'next/server'
import { OpenAIHederaIntegration } from '../../utils/openai-hedera-integration'
import { deepSanitize, sanitizeText } from '../../utils/pii'
import { 
  Client, 
  AccountId, 
  PrivateKey, 
  AccountCreateTransaction, 
  Hbar,
  TokenCreateTransaction,
  TransferTransaction,
  CustomFixedFee,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction
} from '@hashgraph/sdk'
import { getClient } from '../../utils/hedera'

/**
 * Creates a new Hedera account with initial HBAR balance
 */
async function createFeePayerAccount(client: Client) {
  console.log('Creating new fee payer account...')
  
  // Create a new ECDSA private key
  const privateKey = PrivateKey.generateECDSA()

  // Create a new account with initial balance
  const accountCreateTx = new AccountCreateTransaction()
    .setECDSAKeyWithAlias(privateKey)
    .setInitialBalance(new Hbar(20))
    .setMaxAutomaticTokenAssociations(-1) // Unlimited token associations

  const accountCreateTxResponse = await accountCreateTx.execute(client)
  const accountCreateReceipt = await accountCreateTxResponse.getReceipt(client)
  const newAccountId = accountCreateReceipt.accountId

  console.log(`Created fee payer account: ${newAccountId}`)

  return {
    accountId: newAccountId,
    privateKey: privateKey,
  }
}

/**
 * Creates a mock fee token (USDC-like)
 */
async function createFeeToken(client: Client) {
  console.log('Creating mock fee token...')
  
  if (!client.operatorAccountId) {
    throw new Error('Client operator account ID is not set')
  }
  
  const tokenCreateTx = new TokenCreateTransaction()
    .setTokenName('AMOCA Fee Token')
    .setTokenSymbol('AFT')
    .setTreasuryAccountId(client.operatorAccountId)
    .setInitialSupply(10000) // Larger initial supply

  const executeTx = await tokenCreateTx.execute(client)
  const txReceipt = await executeTx.getReceipt(client)
  const tokenId = txReceipt.tokenId

  console.log(`Fee token created: ${tokenId}`)
  return tokenId
}

/**
 * Transfers tokens between accounts
 */
async function transferFeeTokens(client: Client, tokenId: any, fromAccountId: any, toAccountId: any, amount: number) {
  console.log(`Transferring ${amount} tokens to ${toAccountId}...`)
  
  const transferTx = new TransferTransaction()
    .addTokenTransfer(tokenId, fromAccountId, -amount)
    .addTokenTransfer(tokenId, toAccountId, amount)

  const executeTx = await transferTx.execute(client)
  await executeTx.getReceipt(client)
  
  console.log(`Successfully transferred ${amount} tokens`)
}

/**
 * Creates a topic with custom fees
 */
async function createTopicWithFees(client: Client, feeTokenId: any, feeAmount: number = 5) {
  console.log('Creating topic with custom fees...')
  
  if (!client.operatorAccountId) {
    throw new Error('Client operator account ID is not set')
  }
  
  const customFee = new CustomFixedFee()
    .setDenominatingTokenId(feeTokenId)
    .setAmount(feeAmount)
    .setFeeCollectorAccountId(client.operatorAccountId)

  const topicCreateTx = new TopicCreateTransaction()
    .setCustomFees([customFee])

  const executeTopicCreateTx = await topicCreateTx.execute(client)
  const topicCreateReceipt = await executeTopicCreateTx.getReceipt(client)
  const topicId = topicCreateReceipt.topicId

  console.log(`Topic created with custom fees: ${topicId}`)
  console.log(`Fee structure: ${feeAmount} ${feeTokenId} tokens per message`)

  return topicId
}

/**
 * Submits message with fee payment from specific account
 */
async function submitMessageWithFee(
  feePayerAccountId: any, 
  feePayerPrivateKey: PrivateKey, 
  topicId: any, 
  message: string
) {
  console.log('Submitting message with fee payment...')
  
  // Create new client with fee payer credentials
  const feePayerClient = Client.forTestnet().setOperator(feePayerAccountId, feePayerPrivateKey)

  const submitMessageTx = new TopicMessageSubmitTransaction()
    .setTopicId(topicId)
    .setMessage(message)

  const executeSubmitMessageTx = await submitMessageTx.execute(feePayerClient)
  const submitMessageReceipt = await executeSubmitMessageTx.getReceipt(feePayerClient)
  const transactionId = executeSubmitMessageTx.transactionId?.toString()

  console.log('Message submitted successfully with fee payment')
  console.log(`Transaction status: ${submitMessageReceipt.status}`)
  console.log(`Transaction ID: ${transactionId}`)

  return {
    status: String(submitMessageReceipt.status),
    transactionId: transactionId || '',
    topicId: String(topicId)
  }
}

// Ensure Node.js runtime (not Edge) due to SDKs and environment usage
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(req: NextRequest) {
  try {
    console.log('Processing POST request to submit route...')
    console.log('==============================================')
    
    const { topicId: rawTopicId, payload } = await req.json()
    const { consent, data, user, collected_data, conversation_history } = payload

    console.log('Checking consent status...')
    if (consent === false) {
      console.log('User consent missing, returning consent required response')
      return new Response(JSON.stringify({ status: 'CONSENT_MISSING', consent: false }), { status: 200 })
    }

    const openaiApiKey = process.env.OPENAI_API_KEY
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    // Step 1: Initialize Hedera client
    console.log('Step 1: Initializing Hedera client...')
    const client = await getClient()

    // Step 2: Initialize the OpenAI-Hedera integration utility
    const integration = new OpenAIHederaIntegration(openaiApiKey)
    await integration.initializeHedera()

    const systemPrompt = `You are AMOCA, a friendly and meticulous conversational AI assistant. Your purpose is to guide a user through the process of providing their healthcare data for an observational study on dandelion root usage in cancer patients.

**Your Process:**
1.  **Engage Conversationaly:** Interact with the user in a clear, empathetic, and step-by-step manner.
2.  **Incremental Data Collection:** Your primary goal is to fill out a detailed JSON object with the user's information. Ask one or two related questions at a time.
3.  **State Management:** You will be given the \`collected_data\` so far and the \`conversation_history\`. Use this to understand the context and decide what to ask next.
4.  **Completion:** Once you have gathered all necessary information and the JSON is complete, set the status to "COMPLETE".

**Output JSON Schema:**

Your entire output MUST be personal and empathetic message when the data collection is complete. This will make the interaction feel more human-focused . Add at the endwith a single, valid JSON object with the following structure.

\`\`\`json
{
  "status": "IN_PROGRESS" | "COMPLETE" | "ERROR",
  "next_question": string,
  "collected_data": {
    "patientId": string | null,
    "demographics": { "age": number | null, "gender": string | null, "location": string | null },
    "cancer_details": { "type": string | null, "stage": string | null, "diagnosis_date": string | null, "receptor_status": string | null, "location": string | null },
    "conventional_treatment": { "surgery": object | null, "chemotherapy": object | null, "radiation": object | null, "hormone_therapy": object | null },
    "dandelion_usage": { "start_date": string | null, "form": string | null, "dosage": string | null, "brand": string | null, "reason": string | null, "duration_months": number | null, "concurrent_with_treatment": boolean | null },
    "reported_effects": { "side_effect_reduction": object | null, "tumor_response": object | null },
    "lab_values": array | null,
    "patient_notes": string | null
  }
}
\`\`\`

**Current State:**
-   User: anonymous
-   Data collected so far: ${JSON.stringify(collected_data, null, 2)}
-   Conversation History: ${JSON.stringify(conversation_history, null, 2)}
`

    // Sanitize personal data from the incoming free-text before sending to OpenAI
    const userContent = sanitizeText(data ?? '')

    // Step 3: Get OpenAI response
    console.log('Step 3: Getting OpenAI response...')
    const aiResponse = await integration.getOpenAIResponse(
      systemPrompt,
      userContent,
      {
        model: 'gpt-4o-mini',
        temperature: 0.5,
        responseFormat: 'json_object'
      }
    )

    // Step 4: If the AI says the data collection is complete, implement full Hedera workflow
    if (aiResponse.status === 'COMPLETE') {
      console.log('Step 4: Data collection complete, implementing full Hedera workflow...')
      
      try {
        // Step 4a: Create fee payer account
        const feePayerAccount = await createFeePayerAccount(client)
        console.log(`Fee payer account created: ${feePayerAccount.accountId}`)

        // Step 4b: Create fee token
        const feeTokenId = await createFeeToken(client)
        console.log(`Fee token created: ${feeTokenId}`)

        // Step 4c: Transfer tokens to fee payer
        if (!client.operatorAccountId) {
          throw new Error('Client operator account ID is not set for token transfer')
        }
        await transferFeeTokens(client, feeTokenId, client.operatorAccountId, feePayerAccount.accountId, 100)
        console.log('Transferred 100 tokens to fee payer account')

        // Step 4d: Create topic with custom fees (or use existing one)
        let topicId = rawTopicId
        if (!topicId) {
          topicId = await createTopicWithFees(client, feeTokenId, 5)
          console.log(`New topic created with fees: ${topicId}`)
        } else {
          console.log(`Using existing topic: ${topicId}`)
        }

        // Step 4e: Prepare final payload with sanitized data
        const finalPayload = deepSanitize({
          consent: true,
          timestamp: new Date().toISOString(),
          session_id: `amoca_${Date.now()}`,
          user_type: 'anonymous',
          data_collection_complete: true,
          ai_conversation: {
            total_interactions: (conversation_history?.length || 0) + 1,
            completion_status: aiResponse.status
          },
          ...aiResponse.collected_data,
        })

        console.log('Final payload prepared and sanitized')

        // Step 4f: Submit message using fee payer account
        const hederaResult = await submitMessageWithFee(
          feePayerAccount.accountId,
          feePayerAccount.privateKey,
          topicId,
          JSON.stringify(finalPayload)
        )

        console.log('==============================================')
        console.log('WORKFLOW COMPLETED SUCCESSFULLY!')
        console.log(`Topic: ${hederaResult.topicId}`)
        console.log(`Transaction: ${hederaResult.transactionId}`)
        console.log(`Fee payer: ${feePayerAccount.accountId}`)
        console.log(`Fee token: ${feeTokenId}`)
        console.log('==============================================')

        // Return the final confirmation with full workflow details
        return new Response(
          JSON.stringify({
            ...aiResponse,
            hedera_status: hederaResult.status,
            transactionId: hederaResult.transactionId,
            topicId: hederaResult.topicId,
            workflow_details: {
              fee_payer_account: String(feePayerAccount.accountId),
              fee_token: String(feeTokenId),
              tokens_transferred: 100,
              fee_per_message: 5,
              workflow_complete: true
            },
            latestResponse: aiResponse,
          }),
          { status: 200 }
        )
      } catch (hederaError: any) {
        console.error('Error in Hedera workflow:', hederaError.message)
        console.error('Full error:', hederaError)
        
        // Still return the AI response but indicate Hedera workflow failed
        return new Response(
          JSON.stringify({
            ...aiResponse,
            hedera_status: 'ERROR',
            hedera_error: hederaError.message,
            workflow_details: {
              workflow_complete: false,
              error_stage: 'hedera_workflow'
            },
            latestResponse: aiResponse,
          }),
          { status: 200 }
        )
      }
    }

    // If the conversation is still in progress, just return the AI's response.
    console.log('Conversation still in progress, returning AI response')
    return new Response(
      JSON.stringify({ 
        latestResponse: aiResponse,
        workflow_details: {
          workflow_complete: false,
          status: 'in_progress'
        }
      }),
      { status: 200 }
    )
  } catch (e: any) {
    console.error('Error in submit route:', e.message || 'Unknown error')
    console.error('Full error:', e)
    return new Response(
      JSON.stringify({ 
        error: e.message || 'Unknown error',
        workflow_details: {
          workflow_complete: false,
          error_stage: 'initialization'
        }
      }), 
      { status: 500 }
    )
  }
}
