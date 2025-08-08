import { NextRequest } from 'next/server'
import { Client, TopicMessageQuery } from '@hashgraph/sdk'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

function requireEnv(name: string) {
  const v = process.env[name]
  if (!v) throw new Error(`Missing environment variable: ${name}`)
  return v
}

async function getClient() {
  const { AccountId, PrivateKey } = await import('@hashgraph/sdk')
  const client = Client.forTestnet()

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

  const OPERATOR_ADDRESS = requireEnv('OPERATOR_ADDRESS')
  const OPERATOR_KEY = requireEnv('OPERATOR_KEY')
  const opAccountId = await AccountId.fromEvmAddress(0, 0, OPERATOR_ADDRESS).populateAccountNum(client)
  const opPrivateKey = PrivateKey.fromStringECDSA(OPERATOR_KEY)
  client.setOperator(opAccountId, opPrivateKey)
  return client
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const topicId = searchParams.get('topicId') || process.env.NEXT_PUBLIC_DEFAULT_TOPIC_ID || '0.0.6531943'

  const stream = new ReadableStream<Uint8Array>({
    start: async (controller) => {
      const enc = new TextEncoder()

      function sendEvent(obj: any) {
        controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`))
      }

      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => controller.enqueue(enc.encode(`: ping\n\n`)), 15000)

      try {
        const client = await getClient()

        const subscription = new TopicMessageQuery()
          .setTopicId(topicId)
          .subscribe(
            client,
            (message) => {
              try {
                const content = Buffer.from(message.contents).toString('utf8')
                sendEvent({
                  type: 'message',
                  content,
                  consensusTimestamp: String((message as any).consensusTimestamp || ''),
                  sequenceNumber: (message as any).sequenceNumber ?? null,
                })
              } catch (err: any) {
                sendEvent({ type: 'error', error: err?.message || 'parse failed' })
              }
            },
            (err) => {
              sendEvent({ type: 'error', error: err?.message || 'subscription error' })
            }
          ) as any

        // On stream cancel/close, cleanup subscription
        // @ts-ignore
        ;(stream as any)._cancel = () => {
          try { subscription?.unsubscribe?.() } catch {}
          try { clearInterval(heartbeat) } catch {}
        }
      } catch (e: any) {
        sendEvent({ type: 'error', error: e?.message || 'init failed' })
      }
    },
    cancel: () => {
      // Best-effort cleanup handled above
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
