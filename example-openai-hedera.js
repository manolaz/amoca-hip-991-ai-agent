const dotenv = require('dotenv')
const { Client, TopicMessageSubmitTransaction, TopicCreateTransaction } = require('@hashgraph/sdk')
const OpenAI = require('openai')
dotenv.config()

/**
 * Example script demonstrating the pattern:
 * 1. Get result from OpenAI API
 * 2. Send that result to Hedera topic
 */

const getClient = async () => {
  const client = Client.forTestnet()
  
  // Use environment variables for operator credentials
  const operatorId = process.env.PAYER_ACCOUNT_ID || process.env.OPERATOR_ACCOUNT_ID
  const operatorKey = process.env.PAYER_PRIVATE_KEY || process.env.OPERATOR_KEY
  
  if (!operatorId || !operatorKey) {
    throw new Error('Missing operator credentials in environment variables')
  }
  
  client.setOperator(operatorId, operatorKey)
  return client
}

const main = async () => {
  console.log('Initializing Hedera client...')
  const client = await getClient()
  
  console.log('Initializing OpenAI client...')
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  // Create a topic for messages (or use existing topic ID)
  let topicId = process.env.NEXT_PUBLIC_DEFAULT_TOPIC_ID
  
  if (!topicId) {
    console.log('Creating new topic...')
    const topicCreateTx = new TopicCreateTransaction()
    const executeTopicCreateTx = await topicCreateTx.execute(client)
    const topicCreateReceipt = await executeTopicCreateTx.getReceipt(client)
    topicId = topicCreateReceipt.topicId
    console.log(`Topic created successfully with ID: ${topicId}`)
  } else {
    console.log(`Using existing topic: ${topicId}`)
  }

  // Example healthcare data collection prompt
  const healthcarePrompt = `You are AMOCA, a healthcare data collection assistant. 
  Analyze the following user input and extract structured healthcare information.
  Return a JSON response with the following structure:
  {
    "status": "COMPLETE" | "NEEDS_MORE_INFO",
    "message": "Your response to the user",
    "collected_data": {
      "cancer_type": string | null,
      "diagnosis_date": string | null,
      "treatment_status": string | null
    }
  }`

  // Simulate user input
  const userInputs = [
    "I was diagnosed with breast cancer in January 2023",
    "I am currently undergoing chemotherapy treatment",
    "I have been taking dandelion root supplements for 3 months"
  ]

  for (const userInput of userInputs) {
    console.log(`\nProcessing user input: "${userInput}"`)
    
    try {
      // Step 1: Get result from OpenAI API
      console.log('Sending request to OpenAI API...')
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: healthcarePrompt },
          { role: 'user', content: userInput }
        ]
      })

      const responseText = completion.choices?.[0]?.message?.content || '{}'
      const aiResponse = JSON.parse(responseText)
      console.log('Received response from OpenAI:', JSON.stringify(aiResponse, null, 2))

      // Step 2: Send result to Hedera topic
      console.log('Submitting message to Hedera topic...')
      const submitMessageTx = new TopicMessageSubmitTransaction()
        .setTopicId(topicId)
        .setMessage(JSON.stringify({
          timestamp: new Date().toISOString(),
          user_input: userInput,
          ai_response: aiResponse
        }))

      const executeSubmitMessageTx = await submitMessageTx.execute(client)
      const receipt = await executeSubmitMessageTx.getReceipt(client)
      const transactionId = executeSubmitMessageTx.transactionId?.toString()

      console.log(`Message submitted successfully to topic ${topicId}`)
      console.log(`Transaction status: ${receipt.status}`)
      console.log(`Transaction ID: ${transactionId}`)

    } catch (error) {
      console.error('Error processing user input:', error.message)
    }
  }

  console.log('\nExample completed successfully!')
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err)
    process.exit(1)
  })
