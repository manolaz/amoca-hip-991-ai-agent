import { NextRequest } from 'next/server'
import { OpenAIHederaIntegration } from '../../../../../../../utils/openai-hedera-integration'
import { deepSanitize, sanitizeText } from '../../utils/pii'

// Ensure Node.js runtime (not Edge) due to SDKs and environment usage
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(req: NextRequest) {
  try {
    console.log('Processing POST request to submit route...')
    
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

    // Initialize the integration utility
    const integration = new OpenAIHederaIntegration(openaiApiKey)

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

    // Get OpenAI response
    const aiResponse = await integration.getOpenAIResponse(
      systemPrompt,
      userContent,
      {
        model: 'gpt-4o-mini',
        temperature: 0.5,
        responseFormat: 'json_object'
      }
    )

    // If the AI says the data collection is complete, submit it to Hedera.
    if (aiResponse.status === 'COMPLETE') {
      console.log('Data collection complete, submitting to Hedera...')
      
      const topicId = rawTopicId || process.env.NEXT_PUBLIC_DEFAULT_TOPIC_ID
      if (!topicId) {
        console.error('Hedera Topic ID is not configured!')
        throw new Error('Hedera Topic ID is not configured!')
      }

      try {
        // Deep-sanitize any remnants in collected_data before persisting to Hedera
        const finalPayload = deepSanitize({
          consent: true,
          timestamp: new Date().toISOString(),
          ...aiResponse.collected_data,
        })

        const hederaResult = await integration.submitToHederaTopic(
          topicId,
          finalPayload,
          { addTimestamp: false } // We already added timestamp
        )

        // Return the final confirmation including the transaction ID
        return new Response(
          JSON.stringify({
            ...aiResponse,
            hedera_status: hederaResult.status,
            transactionId: hederaResult.transactionId,
            topicId: hederaResult.topicId,
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
