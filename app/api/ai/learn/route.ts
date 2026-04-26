import { streamObject } from 'ai'
import { NextRequest } from 'next/server'
import { createModel } from '@/lib/ai/factory'
import { AIProvider } from '@/lib/ai/types'
import { learnSystemPrompt, learnUserPrompt, LearnMode } from '@/lib/prompts/templates'
import { LearnResultSchema } from '@/lib/ai/schemas'
import { UserProfile } from '@/lib/storage/types'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    topic,
    count = 10,
    mode = 'words',
    provider,
    apiKey,
    model,
    profile,
  }: {
    topic: string
    count?: number
    mode?: LearnMode
    provider: AIProvider
    apiKey: string
    model?: string
    profile: UserProfile
  } = body

  if (!apiKey) {
    return new Response(JSON.stringify({ error: `[${provider}] API key 为空，请在设置中填写` }), {
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

  console.log(`[learn] provider=${provider} model=${model ?? 'default'} topic=${topic} mode=${mode}`)

  const aiModel = createModel({ provider, apiKey, model })

  const result = streamObject({
    model: aiModel,
    schema: LearnResultSchema,
    system: learnSystemPrompt(profile),
    prompt: learnUserPrompt(topic, count, mode),
  })

  return result.toTextStreamResponse()
}
