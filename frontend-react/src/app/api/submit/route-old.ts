import { NextRequest } from 'next/server'
import { TopicMessageSubmitTransaction } from '@hashgraph/sdk'
import OpenAI from 'openai'
import { getClient } from '../../utils/hedera'
import { deepSanitize, sanitizeText } from '../../utils/pii'

// Ensure Node.js runtime (not Edge) due to SDKs and environment usage
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Note: This route runs on the server. It uses OPERATOR_ADDRESS/OPERATOR_KEY from env at the app root.

export async function POST(req: NextRequest) {
  try {
    console.log('Processing POST request to submit route...')
    
    // The payload now includes the conversation history and current state
    const { topicId: rawTopicId, payload } = await req.json()
    const { consent, data, user, collected_data, conversation_history } = payload

    console.log('Checking consent status...')
    if (consent === false) {
      console.log('User consent missing, returning consent required response')
      return new Response(JSON.stringify({ status: 'CONSENT_MISSING', consent: false }), { status: 200 })
    }

    console.log('Initializing OpenAI client...')
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

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

**Conversation Flow & Rules:**
-   **Start:** If \`collected_data\` is empty, start with a welcoming message and ask the first question (e.g., about cancer type and diagnosis date).
-   **Continue:** Based on the user's last message and the existing \`collected_data\`, fill in the JSON and ask the next logical question. For example, after getting the cancer type, ask about the stage.
-   **Be Clear:** Frame your questions clearly. Example: "Thanks. Next, could you tell me about your surgery, if you had one? What type was it and when did it take place?"
-   **Handle "I don't know":** If the user doesn't know or doesn't want to answer, acknowledge it and move to the next topic. Set the corresponding field to \`null\`.
-   **Completion & Rewards:** When all fields are reasonably filled, set the status to "COMPLETE". Your final message in \`next_question\` should be a warm, human-readable summary and thank you. It MUST mention that high-quality data contributions can earn AMOCA rewards. For example: "Thank you so much for taking the time to share your journey with me. Your willingness to provide this information is a truly valuable gift to researchers and fellow patients. Every detail you've shared helps paint a clearer picture for the study. We believe in the power of shared knowledge, and contributions like yours are the key to unlocking new insights. As a token of our appreciation, high-quality and verifiable data sets like the one you've provided are eligible for AMOCA rewards. Your information is now being securely submitted to the research database. We are deeply grateful for your partnership in this important work."
-   **PII:** Do not ask for or store names, emails, or exact addresses. Remind the user not to share PII.

**Current State:**
-   User: anonymous
-   Data collected so far: ${JSON.stringify(collected_data, null, 2)}
-   Conversation History: ${JSON.stringify(conversation_history, null, 2)}
`

  // Sanitize personal data from the incoming free-text before sending to OpenAI
  const userContent = sanitizeText(data ?? '')

    console.log('Sending request to OpenAI API...')
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.5,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ]
    })

    const responseText = completion.choices?.[0]?.message?.content || '{}'
    console.log('Received response from OpenAI API')
    
    const aiResponse = JSON.parse(responseText)

    // If the AI says the data collection is complete, submit it to Hedera.
    if (aiResponse.status === 'COMPLETE') {
      console.log('Data collection complete, submitting to Hedera...')
      
      const topicId = rawTopicId || process.env.NEXT_PUBLIC_DEFAULT_TOPIC_ID
      if (!topicId) {
        console.error('Hedera Topic ID is not configured!')
        throw new Error('Hedera Topic ID is not configured!')
      }

      try {
        console.log(`Getting Hedera client for topic: ${topicId}`)
        const client = await getClient()
        
        // Deep-sanitize any remnants in collected_data before persisting to Hedera
        const finalPayload = deepSanitize({
          consent: true,
          timestamp: new Date().toISOString(),
          ...aiResponse.collected_data,
        })

        console.log('Submitting message to Hedera topic...')
        const submitMessageTx = new TopicMessageSubmitTransaction()
          .setTopicId(topicId)
          .setMessage(JSON.stringify(finalPayload))

        const executeSubmitMessageTx = await submitMessageTx.execute(client)
        const receipt = await executeSubmitMessageTx.getReceipt(client)
        const transactionId = executeSubmitMessageTx.transactionId?.toString()

        console.log(`Message submitted successfully to topic ${topicId}`)
        console.log(`Transaction status: ${receipt.status}`)
        console.log(`Transaction ID: ${transactionId}`)

        // Return the final confirmation including the transaction ID
        return new Response(
          JSON.stringify({
            ...aiResponse,
            hedera_status: String(receipt.status),
            transactionId,
            topicId,
            latestResponse: aiResponse,
          }),
          { status: 200 }
        )
      } catch (hederaError: any) {
        console.error('Error submitting message to Hedera:', hederaError.message)
        
        // Still return the AI response but indicate Hedera submission failed
        return new Response(
          JSON.stringify({
            ...aiResponse,
            hedera_status: 'ERROR',
            hedera_error: hederaError.message,
            latestResponse: aiResponse,
          }),
          { status: 200 }
        )
      }
    }

    // If the conversation is still in progress, just return the AI's response.
    console.log('Conversation still in progress, returning AI response')
    return new Response(
      JSON.stringify({ latestResponse: aiResponse }),
      { status: 200 }
    )
  } catch (e: any) {
    console.error('Error in submit route:', e.message || 'Unknown error')
    return new Response(JSON.stringify({ error: e.message || 'Unknown error' }), { status: 500 })
  }
}
