const dotenv = require('dotenv')
const getClient = require('./utils/client')
const {
  TopicCreateTransaction,
  CustomFixedFee,
  Client,
  TopicMessageSubmitTransaction,
} = require('@hashgraph/sdk')
const { createMockUSDC, transferTokens } = require('./utils/token')
const createAccount = require('./utils/account')
const { getUserInput, closeReadline } = require('./utils/message')

// Load environment variables
dotenv.config()

// ---- Configuration (with env overrides) ----
const TOKEN_TRANSFER_AMOUNT = parseInt(process.env.TOKEN_TRANSFER_AMOUNT || '100', 10)
const MESSAGE_FEE = parseInt(process.env.MESSAGE_FEE || '5', 10)

/**
 * Build a fixed token-denominated custom fee.
 * @param {string} tokenId - Token ID used to denominate the fee
 * @param {number} amount - Fixed amount of token charged per message
 * @param {string} collectorAccountId - Account ID to collect the fee
 */
function buildFixedTokenFee(tokenId, amount, collectorAccountId) {
  return new CustomFixedFee()
    .setDenominatingTokenId(tokenId)
    .setAmount(amount)
    .setFeeCollectorAccountId(collectorAccountId)
}

/**
 * Create a topic with the provided custom fees.
 * @param {import('@hashgraph/sdk').Client} client
 * @param {import('@hashgraph/sdk').CustomFee[]} customFees
 * @returns {Promise<string>} topicId
 */
async function createTopicWithFees(client, customFees) {
  const tx = new TopicCreateTransaction().setCustomFees(customFees)
  const submitted = await tx.execute(client)
  const receipt = await submitted.getReceipt(client)
  return receipt.topicId
}

/**
 * Submit a message to a topic using the fee payer as operator.
 * Uses testnet to mirror original behavior.
 * @param {{accountId: string, privateKey: any}} feePayer
 * @param {string} topicId
 * @param {string} message
 */
async function submitMessageAsFeePayer(feePayer, topicId, message) {
  const tx = new TopicMessageSubmitTransaction().setTopicId(topicId).setMessage(message)
  const feePayerClient = Client.forTestnet().setOperator(feePayer.accountId, feePayer.privateKey)
  const submitted = await tx.execute(feePayerClient)
  const receipt = await submitted.getReceipt(feePayerClient)
  return receipt
}

async function runPublisher() {
  console.log('Initializing Hedera client...')
  const client = await getClient()

  // 1) Create fee payer account
  console.log('Creating fee payer account...')
  const feePayer = await createAccount(client)
  console.log(`Fee payer account ID: ${feePayer.accountId}`)

  // 2) Create mock USDC and fund fee payer
  console.log('Creating mock USDC token...')
  const mockUSDC = await createMockUSDC(client)
  console.log(`Mock USDC token ID: ${mockUSDC}`)

  console.log(`Transferring ${TOKEN_TRANSFER_AMOUNT} tokens to fee payer...`)
  await transferTokens(
    client,
    mockUSDC,
    client.operatorAccountId,
    feePayer.accountId,
    TOKEN_TRANSFER_AMOUNT
  )
  console.log('Funding transfer complete.')

  // 3) Configure custom fee and create topic
  console.log('Configuring custom fee...')
  const customFee = buildFixedTokenFee(mockUSDC, MESSAGE_FEE, client.operatorAccountId)
  console.log(`Custom fee: ${MESSAGE_FEE} ${mockUSDC} tokens per message (collector: ${client.operatorAccountId})`)

  console.log('Creating topic with custom fee...')
  const topicId = await createTopicWithFees(client, [customFee])
  console.log(`Topic created: ${topicId}`)

  // 4) Interactive message loop
  console.log('\nMessage submission started. Type "exit" to finish.')
  console.log('----------------------------------------')

  const onSigint = () => {
    console.log('\nCaught interrupt signal. Exiting...')
    closeReadline()
    process.exit(0)
  }
  process.once('SIGINT', onSigint)

  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const input = await getUserInput('Enter message (or "exit"): ')

      if (!input) {
        console.log('Message cannot be empty.')
        continue
      }

      const message = String(input).trim()
      if (message.toLowerCase() === 'exit') {
        console.log('Exiting message loop...')
        break
      }

      try {
        const receipt = await submitMessageAsFeePayer(feePayer, topicId, message)
        console.log(`Submitted message → topic: ${topicId}`)
        console.log(`Status: ${receipt.status}`)
      } catch (err) {
        console.error('Failed to submit message:', err?.message || err)
      }
    }
  } finally {
    closeReadline()
    process.removeListener('SIGINT', onSigint)
  }
}

// Entry point
runPublisher()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error:', err?.message || err)
    try { closeReadline() } catch (_) {}
    process.exit(1)
  })
