import { NextRequest } from 'next/server'
import { Client, TopicMessageSubmitTransaction } from '@hashgraph/sdk'
import OpenAI from 'openai'

// Ensure Node.js runtime (not Edge) due to SDKs and environment usage
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

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

    // Also run the AI agent logic (mirrors agent.js) and include latest response
    let latestResponse: any = null
    let aiError: string | null = null
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

      const systemPrompt = `You are AMOCA, a healthcare data validator and formatter.
\nGoals:
1) Check if the user consent to share healthcare data for research/validation on Hedera is explicitly provided.
2) If consent is missing or false, return a JSON object with status="CONSENT_MISSING" and do not include any processed data.
3) If consent is true, assess whether the shared text seems trustworthy (coherent, internally consistent, plausible).
4) Standardize the content into a concise JSON structure.
\nOutput: Return ONLY valid JSON with this schema: {
  "status": "OK" | "CONSENT_MISSING" | "INVALID",
  "consent": boolean,
  "trust_assessment": { "score": number, "reasons": string[] },
  "standardized": {
    "summary": string,
    "icd10_candidates": string[],
    "pii_detected": boolean,
    "pii_redacted_text": string
  },
  "notes": string[]
}
\nRules:
- If consent is missing/false => status=CONSENT_MISSING, keep other fields minimal.
- Keep pii_redacted_text free of names, emails, phone numbers, addresses.
- Always produce compact, valid JSON only.`

      const userContent = JSON.stringify({
        consent: !!payload.consent,
        data: String(payload.data ?? ''),
        user: payload.user ?? null
      })

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
      try {
        latestResponse = JSON.parse(responseText)
      } catch {
        latestResponse = { raw: responseText }
      }
    } catch (err: any) {
      aiError = err?.message || 'AI processing failed'
    }

    return new Response(
      JSON.stringify({
        ok: true,
        status: String(receipt.status),
        transactionId: tx.transactionId?.toString?.(),
        latestResponse,
        aiError
      }),
      { status: 200 }
    )
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'Unknown error' }), { status: 500 })
  }
}
