import { NextRequest } from 'next/server'
import { Client, TopicMessageSubmitTransaction } from '@hashgraph/sdk'

// Note: This route runs on the server. It uses OPERATOR_ADDRESS/OPERATOR_KEY from env at the app root.

function requireEnv(name: string) {
  const v = process.env[name]
  if (!v) throw new Error(`Missing environment variable: ${name}`)
  return v
}

async function getClient() {
  const { AccountId, PrivateKey } = await import('@hashgraph/sdk')
  const client = Client.forTestnet()

  // Prefer dedicated payer if provided (useful when topic has custom token fees)
  const PAYER_PRIVATE_KEY = process.env.PAYER_PRIVATE_KEY
  const PAYER_ACCOUNT_ID = process.env.PAYER_ACCOUNT_ID
  const PAYER_EVM_ADDRESS = process.env.PAYER_EVM_ADDRESS

  if (PAYER_PRIVATE_KEY && (PAYER_ACCOUNT_ID || PAYER_EVM_ADDRESS)) {
    const privateKey = PrivateKey.fromStringECDSA(PAYER_PRIVATE_KEY)
    const accountId = PAYER_ACCOUNT_ID
      ? AccountId.fromString(PAYER_ACCOUNT_ID)
      : await AccountId.fromEvmAddress(0, 0, String(PAYER_EVM_ADDRESS)).populateAccountNum(client)
    client.setOperator(accountId, privateKey)
    return client
  }

  // Fallback to operator
  const OPERATOR_ADDRESS = requireEnv('OPERATOR_ADDRESS')
  const OPERATOR_KEY = requireEnv('OPERATOR_KEY')
  const opAccountId = await AccountId.fromEvmAddress(0, 0, OPERATOR_ADDRESS).populateAccountNum(client)
  const opPrivateKey = PrivateKey.fromStringECDSA(OPERATOR_KEY)
  client.setOperator(opAccountId, opPrivateKey)
  return client
}

export async function POST(req: NextRequest) {
  try {
    const { topicId, payload } = await req.json()
    if (!topicId) return new Response(JSON.stringify({ error: 'topicId is required' }), { status: 400 })
    if (!payload) return new Response(JSON.stringify({ error: 'payload is required' }), { status: 400 })

    const client = await getClient()
    const tx = await new TopicMessageSubmitTransaction()
      .setTopicId(topicId)
      .setMessage(JSON.stringify(payload))
      .execute(client)
    const receipt = await tx.getReceipt(client)

    return new Response(JSON.stringify({ ok: true, status: String(receipt.status), transactionId: tx.transactionId?.toString?.() }), { status: 200 })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'Unknown error' }), { status: 500 })
  }
}
