const dotenv = require('dotenv')
const getClient = require('./utils/client')
const { TopicMessageQuery } = require('@hashgraph/sdk')
const OpenAI = require('openai')
const { loadAnalyticsPrompt } = require('./utils/prompt-loader')

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
                // Load system prompt from external file
                console.log('Loading analytics system prompt from external file...')
                const systemPrompt = loadAnalyticsPrompt(
                    { message_data: payload.data }, // collected data from message
                    [{ role: 'user', content: payload.data }] // conversation history
                )

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