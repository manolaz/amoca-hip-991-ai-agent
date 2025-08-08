import { NextRequest } from 'next/server'
import { TopicMessageSubmitTransaction } from '@hashgraph/sdk'
import OpenAI from 'openai'
import { getClient, checkTopicMessage } from '../../utils/hedera'

// Ensure Node.js runtime (not Edge) due to SDKs and environment usage
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Note: This route runs on the server. It uses OPERATOR_ADDRESS/OPERATOR_KEY from env at the app root.

export async function POST(req: NextRequest) {
  try {
    const { topicId: rawTopicId, payload } = await req.json()
    const topicId = rawTopicId || process.env.NEXT_PUBLIC_DEFAULT_TOPIC_ID || '0.0.6531943'
    if (!topicId) return new Response(JSON.stringify({ error: 'topicId is required' }), { status: 400 })
    if (!payload) return new Response(JSON.stringify({ error: 'payload is required' }), { status: 400 })

    const client = await getClient()
    const tx = await new TopicMessageSubmitTransaction()
      .setTopicId(topicId)
      .setMessage(JSON.stringify(payload))
      .execute(client)
    const receipt = await tx.getReceipt(client)
    const transactionId = tx.transactionId?.toString()

    // Verify the message was received by the network
    const messageConfirmed = transactionId ? await checkTopicMessage(topicId, transactionId) : false

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
        transactionId,
        messageConfirmed,
        latestResponse,
        aiError
      }),
      { status: 200 }
    )
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'Unknown error' }), { status: 500 })
  }
}
