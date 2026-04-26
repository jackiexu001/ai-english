import { streamObject } from 'ai'
import { NextRequest } from 'next/server'
import { createModel } from '@/lib/ai/factory'
import { AIProvider } from '@/lib/ai/types'
import { readingSystemPrompt, readingUserPrompt } from '@/lib/prompts/templates'
import { ReadingResultSchema } from '@/lib/ai/schemas'
import { UserProfile } from '@/lib/storage/types'

export async function POST(req: NextRequest) {
  const { topic, provider, apiKey, model, profile }: {
    topic: string
    provider: AIProvider
    apiKey: string
    model?: string
    profile: UserProfile
  } = await req.json()

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key 为空，请在设置中填写' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  if (!topic) {
    return new Response(JSON.stringify({ error: 'Topic is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  console.log(`[reading] provider=${provider} model=${model ?? 'default'} topic=${topic}`)

  const aiModel = createModel({ provider, apiKey, model })

  const result = streamObject({
    model: aiModel,
    schema: ReadingResultSchema,
    system: readingSystemPrompt(profile),
    prompt: readingUserPrompt(topic),
  })

  return result.toTextStreamResponse()
}
