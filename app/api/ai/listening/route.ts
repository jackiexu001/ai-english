import { streamObject } from 'ai'
import { NextRequest } from 'next/server'
import { createModel } from '@/lib/ai/factory'
import { AIProvider } from '@/lib/ai/types'
import { listeningDictationPrompt, listeningComprehensionPrompt } from '@/lib/prompts/templates'
import { DictationResultSchema, ComprehensionResultSchema } from '@/lib/ai/schemas'
import { UserProfile } from '@/lib/storage/types'

export async function POST(req: NextRequest) {
  const { topic, mode, provider, apiKey, model, profile }: {
    topic: string
    mode: 'dictation' | 'comprehension'
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

  console.log(`[listening] provider=${provider} model=${model ?? 'default'} mode=${mode} topic=${topic}`)

  const aiModel = createModel({ provider, apiKey, model })

  if (mode === 'dictation') {
    const result = streamObject({
      model: aiModel,
      schema: DictationResultSchema,
      system: listeningDictationPrompt(profile, topic),
      prompt: `Generate the dictation exercise for topic: "${topic}"`,
    })
    return result.toTextStreamResponse()
  } else {
    const result = streamObject({
      model: aiModel,
      schema: ComprehensionResultSchema,
      system: listeningComprehensionPrompt(profile, topic),
      prompt: `Generate the comprehension exercise for topic: "${topic}"`,
    })
    return result.toTextStreamResponse()
  }
}
