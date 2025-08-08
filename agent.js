const dotenv = require('dotenv')
const getClient = require('./utils/client')
const { TopicMessageQuery } = require('@hashgraph/sdk')
const OpenAI = require('openai')

dotenv.config()

const main = async () => {
    // Get topic ID from command line argument
    const topicId = process.argv[2]
    if (!topicId) {
        console.error('Please provide a topic ID as a command line argument')
        console.error('Usage: node agent.js 0.0.1234')
        process.exit(1)
    }

    console.log('Initializing Hedera client...')
    const client = await getClient()

    // Initialize OpenAI client
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
    })

    console.log(`Subscribing to topic ${topicId}...`)

    // Create a new topic message query
    new TopicMessageQuery()
        .setTopicId(topicId)
        .subscribe(client, async (message) => {
            try {
                // Convert message bytes to string
                const messageText = Buffer.from(message.contents).toString('utf8')
                console.log(`Received message: ${messageText}`)

                // Expecting JSON payload from frontend: { consent: boolean, data: string, user?: string }
                let payload
                try {
                    payload = JSON.parse(messageText)
                } catch (e) {
                    console.warn('Message is not valid JSON. Wrapping as raw text.')
                    payload = { consent: false, data: messageText }
                }

                // Build system prompt to validate consent and standardize healthcare data
                const systemPrompt = `You are AMOCA, a specialized healthcare data processor for an observational study on dandelion root usage in cancer patients.

**Primary Goals:**
1.  **Consent Verification:** First, confirm that the user has given explicit consent to share their data. If consent is missing or explicitly set to \`false\`, your ONLY output should be: \`{"status": "CONSENT_MISSING", "consent": false}\`. Do not process any data.
2.  **Data Standardization:** If consent is given, your main task is to parse the user's raw text input and structure it into a detailed JSON object. The input may be messy, incomplete, or conversational. Extract and organize the information according to the schema below.
3.  **Trust Assessment:** While standardizing, assess the provided data for trustworthiness (coherence, plausibility).

**Output JSON Schema:**

Your entire output MUST be ersonal and empathetic message when the data collection is complete. This will make the interaction feel more human-focused, with a single, valid JSON object with the following structure.

\`\`\`json
{
  "status": "OK" | "CONSENT_MISSING" | "INVALID_DATA",
  "consent": boolean,
  "trust_assessment": {
    "score": number,
    "reasons": string[]
  },
  "standardized_data": {
    "patientId": string,
    "demographics": {
      "age": number,
      "gender": "female" | "male" | "other" | "unknown",
      "location": string
    },
    "cancer_details": {
      "type": string,
      "stage": string,
      "diagnosis_date": "YYYY-MM-DD",
      "receptor_status": string,
      "location": string
    },
    "conventional_treatment": {
      "surgery": { "type": string, "date": "YYYY-MM-DD" },
      "chemotherapy": { "regimen": string, "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD", "response": string },
      "radiation": { "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD", "total_dose": string },
      "hormone_therapy": { "medication": string, "start_date": "YYYY-MM-DD", "ongoing": boolean }
    },
    "dandelion_usage": {
      "start_date": "YYYY-MM-DD",
      "form": string,
      "dosage": string,
      "brand": string,
      "reason": string,
      "duration_months": number,
      "concurrent_with_treatment": boolean
    },
    "reported_effects": {
      "side_effect_reduction": {
        "nausea": string,
        "fatigue": string,
        "appetite": string,
        "liver_function": string
      },
      "tumor_response": {
        "pre_dandelion_size": string,
        "post_treatment_size": string,
        "mri_date": "YYYY-MM-DD",
        "oncologist_notes": string
      }
    },
    "lab_values": [
      {
        "date": "YYYY-MM-DD",
        "alt": number,
        "ast": number,
        "bilirubin": number,
        "notes": string
      }
    ],
    "patient_notes": string,
    "pii_redacted_text": string
  },
  "notes": string[]
}
\`\`\`

**Crucial Rules:**
-   **JSON ONLY:** Your entire output must be a single, valid JSON object.
-   **PII Redaction:** Aggressively redact all Personally Identifiable Information (PII) like names, specific addresses, phone numbers, and emails from the final output, especially within \`patient_notes\` and \`pii_redacted_text\`. Use placeholders like \`[REDACTED_NAME]\`.
-   **Handle Incompleteness:** Do not invent data. If a value isn't provided, omit the key or use \`null\`. Your \`notes\` field can be used to mention what information is missing.`

                const userContent = JSON.stringify({
                    consent: !!payload.consent,
                    data: String(payload.data ?? ''),
                    user: payload.user ?? null
                })

                // Generate structured response using OpenAI JSON mode
                const completion = await openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    temperature: 0.2,
                    response_format: { type: 'json_object' },
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userContent }
                    ]
                })

                const responseText = completion.choices?.[0]?.message?.content || '{}'
                // Parse and pretty-print result
                try {
                    const json = JSON.parse(responseText)
                    console.log('AI Validation + Standardization Result:', JSON.stringify(json, null, 2))
                } catch (e) {
                    console.log('AI Response (non-JSON):', responseText)
                }
            } catch (error) {
                console.error('Error processing message:', error)
            }
        })
}

main()
    .then(() => {
        // Keep the process running
        process.stdin.resume()
    })
    .catch(err => {
        console.error(err)
        process.exit(1)
    })