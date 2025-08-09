import { NextRequest } from 'next/server'
import { OpenAIHederaIntegration } from '../../utils/openai-hedera-integration'
import { deepSanitize, sanitizeText } from '../../utils/pii'
import { loadAnalyticsPrompt } from '../../utils/prompt-loader'
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

/**
 * Submits a message using the current operator (no custom fee handling)
 */
async function submitMessageAsOperator(
  client: Client,
  topicId: any,
  message: string
) {
  console.log('Submitting message as operator...')

  const submitMessageTx = new TopicMessageSubmitTransaction()
    .setTopicId(topicId)
    .setMessage(message)

  const executeSubmitMessageTx = await submitMessageTx.execute(client)
  const submitMessageReceipt = await executeSubmitMessageTx.getReceipt(client)
  const transactionId = executeSubmitMessageTx.transactionId?.toString()

  console.log('Message submitted successfully as operator')
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
    const { data, user, collected_data, conversation_history } = payload

    console.log('Processing analytics request...')
    
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

    // Load system prompt from external file
    const systemPrompt = loadAnalyticsPrompt(collected_data, conversation_history)

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

    // Step 4: Check if we have sufficient data for analysis or if collection is complete
    if (aiResponse.status === 'COMPLETE' || aiResponse.status === 'ANALYZED') {
      console.log('Step 4: Data analysis complete, implementing full Hedera workflow...')
      
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

        // Step 4e: Prepare final analytics payload with sanitized data
        const finalPayload = deepSanitize({
          timestamp: new Date().toISOString(),
          session_id: `amoca_analytics_${Date.now()}`,
          analysis_type: 'healthcare_analytics',
          data_analysis_complete: true,
          ai_analytics: {
            total_interactions: (conversation_history?.length || 0) + 1,
            analysis_status: aiResponse.status,
            medical_insights: aiResponse.medical_insights,
            research_findings: aiResponse.research_findings
          },
          ...aiResponse.collected_data,
        })

        console.log('Final analytics payload prepared and sanitized')

        // Determine output topic (supports overriding via env like the agent)
        const outputTopicId = process.env.OUTPUT_TOPIC_ID || String(topicId)

        // Wrap with agent-style envelope and loop-prevention marker
        const publishPayload = deepSanitize({
          __agent_output: true,
          agent: 'amoca-hedra-api',
          sourceTopicId: rawTopicId ? String(rawTopicId) : null,
          outputTopicId: String(outputTopicId),
          timestamp: new Date().toISOString(),
          original: {
            data: userContent,
            user: user ?? null,
            collected_data,
            conversation_history
          },
          analysis: aiResponse,
          standardized: finalPayload
        })

        console.log(`Publishing analytics to topic ${outputTopicId} (env override supported) ...`)

        // Step 4f: Submit message either with fee payer (same topic) or as operator (different topic)
        const sameTopic = String(outputTopicId) === String(topicId)
        const hederaResult = sameTopic
          ? await submitMessageWithFee(
              feePayerAccount.accountId,
              feePayerAccount.privateKey,
              topicId,
              JSON.stringify(publishPayload)
            )
          : await submitMessageAsOperator(
              client,
              outputTopicId,
              JSON.stringify(publishPayload)
            )

        console.log('==============================================')
        console.log('ANALYTICS WORKFLOW COMPLETED SUCCESSFULLY!')
  console.log(`Topic: ${hederaResult.topicId}`)
        console.log(`Transaction: ${hederaResult.transactionId}`)
        console.log(`Analytics processed by: ${feePayerAccount.accountId}`)
        console.log(`Fee token: ${feeTokenId}`)
        console.log('==============================================')

        // Return the final analytics confirmation with full workflow details
        return new Response(
          JSON.stringify({
            ...aiResponse,
            hedera_status: hederaResult.status,
            transactionId: hederaResult.transactionId,
            topicId: hederaResult.topicId,
            outputTopicId: String(outputTopicId),
            workflow_details: {
              analytics_processor: String(feePayerAccount.accountId),
              fee_token: String(feeTokenId),
              tokens_transferred: 100,
              fee_per_message: 5,
              workflow_complete: true,
              publish_mode: (String(outputTopicId) === String(topicId)) ? 'fee_payer' : 'operator',
              analysis_type: 'healthcare_analytics'
            },
            latestResponse: aiResponse,
          }),
          { status: 200 }
        )
      } catch (hederaError: any) {
        console.error('Error in Hedera analytics workflow:', hederaError.message)
        console.error('Full error:', hederaError)
        
        // Still return the AI analytics response but indicate Hedera workflow failed
        return new Response(
          JSON.stringify({
            ...aiResponse,
            hedera_status: 'ERROR',
            hedera_error: hederaError.message,
            workflow_details: {
              workflow_complete: false,
              error_stage: 'hedera_analytics_workflow'
            },
            latestResponse: aiResponse,
          }),
          { status: 200 }
        )
      }
    }

    // If the analytics processing is still in progress, just return the AI's response.
    console.log('Analytics processing still in progress, returning AI response')
    return new Response(
      JSON.stringify({ 
        latestResponse: aiResponse,
        workflow_details: {
          workflow_complete: false,
          status: 'analytics_in_progress'
        }
      }),
      { status: 200 }
    )
  } catch (e: any) {
    console.error('Error in analytics submit route:', e.message || 'Unknown error')
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
