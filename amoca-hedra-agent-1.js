const dotenv = require('dotenv')
const getClient = require('./utils/client')
const { TopicMessageQuery, TopicMessageSubmitTransaction } = require('@hashgraph/sdk')
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

    // Optional: publish results to a different topic to avoid loops
    const outputTopicId = process.env.OUTPUT_TOPIC_ID || topicId

    // Helper to publish a JSON payload back to Hedera
    const publishResult = async (payload) => {
        try {
            const message = JSON.stringify(payload)
            const submitTx = new TopicMessageSubmitTransaction()
                .setTopicId(outputTopicId)
                .setMessage(message)
            const submitRx = await submitTx.execute(client)
            const receipt = await submitRx.getReceipt(client)
            console.log(`Published analysis to topic ${outputTopicId} → status: ${receipt.status}`)
        } catch (e) {
            console.error('Failed to publish analysis result:', e?.message || e)
        }
    }

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

                // Expecting JSON payload from frontend: { data: string, user?: string }
                let payload
                try {
                    payload = JSON.parse(messageText)
                } catch (e) {
                    console.warn('Message is not valid JSON. Wrapping as raw text.')
                    payload = { data: messageText }
                }

                // Guard against re-processing our own output when using the same topic
                if (payload && payload.__agent_output === true) {
                    console.log('Skipping agent output message to prevent loops.')
                    return
                }

                // Build system prompt for healthcare data analytics
                // Load system prompt from external file
                console.log('Loading analytics system prompt from external file...')
                const systemPrompt = loadAnalyticsPrompt(
                    { message_data: payload.data }, // collected data from message
                    [{ role: 'user', content: payload.data }] // conversation history
                )

                const userContent = JSON.stringify({
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
                let analysisResult = null
                try {
                    analysisResult = JSON.parse(responseText)
                    console.log('AI Validation + Standardization Result:', JSON.stringify(analysisResult, null, 2))
                } catch (e) {
                    analysisResult = { raw: responseText }
                    console.log('AI Response (non-JSON):', responseText)
                }

                // Publish the final analysis back to Hedera
                await publishResult({
                    __agent_output: true, // loop-prevention marker
                    agent: 'amoca-hedra-agent-1',
                    sourceTopicId: topicId,
                    outputTopicId,
                    timestamp: new Date().toISOString(),
                    original: payload,
                    analysis: analysisResult
                })
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