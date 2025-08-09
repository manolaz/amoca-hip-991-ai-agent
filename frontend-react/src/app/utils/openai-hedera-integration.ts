import { Client, TopicMessageSubmitTransaction, TopicCreateTransaction } from '@hashgraph/sdk'
import OpenAI from 'openai'
import { getClient } from './hedera'

/**
 * Utility class for OpenAI + Hedera integration
 */
export class OpenAIHederaIntegration {
  private openai: OpenAI
  private client: Client | null = null

  constructor(openaiApiKey?: string) {
    if (!openaiApiKey) {
      throw new Error('OpenAI API key is required')
    }
    this.openai = new OpenAI({ apiKey: openaiApiKey })
  }

  /**
   * Initialize Hedera client
   */
  async initializeHedera(): Promise<void> {
    console.log('Initializing Hedera client...')
    this.client = await getClient()
  }

  /**
   * Get response from OpenAI API
   */
  async getOpenAIResponse(
    systemPrompt: string, 
    userInput: string, 
    options: {
      model?: string
      temperature?: number
      responseFormat?: 'json_object' | 'text'
    } = {}
  ): Promise<any> {
    const {
      model = 'gpt-4o-mini',
      temperature = 0.5,
      responseFormat = 'json_object'
    } = options

    console.log('Sending request to OpenAI API...')
    
    const completion = await this.openai.chat.completions.create({
      model,
      temperature,
      response_format: responseFormat === 'json_object' ? { type: 'json_object' } : undefined,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userInput }
      ]
    })

    const responseText = completion.choices?.[0]?.message?.content || '{}'
    console.log('Received response from OpenAI API')

    if (responseFormat === 'json_object') {
      return JSON.parse(responseText)
    }
    
    return responseText
  }

  /**
   * Submit message to Hedera topic
   */
  async submitToHederaTopic(
    topicId: string, 
    message: object | string,
    options: {
      addTimestamp?: boolean
      sanitize?: boolean
    } = {}
  ): Promise<{
    status: string
    transactionId: string
    topicId: string
  }> {
    if (!this.client) {
      throw new Error('Hedera client not initialized. Call initializeHedera() first.')
    }

    const { addTimestamp = true, sanitize = true } = options

    console.log(`Submitting message to Hedera topic: ${topicId}`)

    let messageData = typeof message === 'string' ? message : message

    if (typeof messageData === 'object' && addTimestamp) {
      messageData = {
        timestamp: new Date().toISOString(),
        ...messageData
      }
    }

    const messageString = typeof messageData === 'string' 
      ? messageData 
      : JSON.stringify(messageData)

    try {
      const submitMessageTx = new TopicMessageSubmitTransaction()
        .setTopicId(topicId)
        .setMessage(messageString)

      const executeSubmitMessageTx = await submitMessageTx.execute(this.client)
      const receipt = await executeSubmitMessageTx.getReceipt(this.client)
      const transactionId = executeSubmitMessageTx.transactionId?.toString()

      console.log(`Message submitted successfully to topic ${topicId}`)
      console.log(`Transaction status: ${receipt.status}`)
      console.log(`Transaction ID: ${transactionId}`)

      return {
        status: String(receipt.status),
        transactionId: transactionId || '',
        topicId
      }
    } catch (error: any) {
      console.error('Error submitting message to Hedera:', error.message)
      throw error
    }
  }

  /**
   * Complete workflow: OpenAI -> Hedera
   */
  async processAndSubmit(
    systemPrompt: string,
    userInput: string,
    topicId: string,
    options: {
      openaiOptions?: {
        model?: string
        temperature?: number
        responseFormat?: 'json_object' | 'text'
      }
      hederaOptions?: {
        addTimestamp?: boolean
        sanitize?: boolean
      }
    } = {}
  ): Promise<{
    aiResponse: any
    hederaResult: {
      status: string
      transactionId: string
      topicId: string
    }
  }> {
    // Ensure Hedera client is initialized
    if (!this.client) {
      await this.initializeHedera()
    }

    // Step 1: Get OpenAI response
    const aiResponse = await this.getOpenAIResponse(
      systemPrompt, 
      userInput, 
      options.openaiOptions
    )

    // Step 2: Submit to Hedera
    const hederaResult = await this.submitToHederaTopic(
      topicId,
      {
        user_input: userInput,
        ai_response: aiResponse
      },
      options.hederaOptions
    )

    return {
      aiResponse,
      hederaResult
    }
  }

  /**
   * Create a new topic
   */
  async createTopic(customFees?: any[]): Promise<string> {
    if (!this.client) {
      await this.initializeHedera()
    }

    console.log('Creating new Hedera topic...')
    
    const topicCreateTx = new TopicCreateTransaction()
    
    if (customFees && customFees.length > 0) {
      topicCreateTx.setCustomFees(customFees)
    }

    const executeTopicCreateTx = await topicCreateTx.execute(this.client!)
    const topicCreateReceipt = await executeTopicCreateTx.getReceipt(this.client!)
    const topicId = topicCreateReceipt.topicId

    console.log(`Topic created successfully with ID: ${topicId}`)
    return String(topicId)
  }
}

/**
 * Convenience function for one-off operations
 */
export async function processWithOpenAIAndHedera(
  systemPrompt: string,
  userInput: string,
  topicId: string,
  openaiApiKey: string,
  options?: {
    openaiOptions?: {
      model?: string
      temperature?: number
      responseFormat?: 'json_object' | 'text'
    }
    hederaOptions?: {
      addTimestamp?: boolean
      sanitize?: boolean
    }
  }
) {
  const integration = new OpenAIHederaIntegration(openaiApiKey)
  return await integration.processAndSubmit(systemPrompt, userInput, topicId, options)
}
