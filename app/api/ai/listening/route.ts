import { generateText } from 'ai'
import { NextRequest, NextResponse } from 'next/server'
import { createModel } from '@/lib/ai/factory'
import { AIProvider } from '@/lib/ai/types'
import { listeningDictationPrompt, listeningComprehensionPrompt } from '@/lib/prompts/templates'
import { UserProfile } from '@/lib/storage/types'

function parseListeningJSON(raw: string): unknown {
  let s = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  const start = s.indexOf('{')
  const end = s.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) s = s.slice(start, end + 1)
  try {
    return JSON.parse(s)
  } catch (e) {
    console.error('[listening] JSON.parse failed:', s.slice(0, 400))
    throw e
  }
}

export async function POST(req: NextRequest) {
  try {
    const { topic, mode, provider, apiKey, model, profile }: {
      topic: string
      mode: 'dictation' | 'comprehension'
      provider: AIProvider
      apiKey: string
      model?: string
      profile: UserProfile
    } = await req.json()

    if (!apiKey) return NextResponse.json({ error: 'API key 为空，请在设置中填写' }, { status: 400 })
    if (!topic)  return NextResponse.json({ error: 'Topic is required' }, { status: 400 })

    console.log(`[listening] provider=${provider} mode=${mode} topic=${topic}`)

    const aiModel = createModel({ provider, apiKey, model })
    const systemPrompt = mode === 'dictation'
      ? listeningDictationPrompt(profile, topic)
      : listeningComprehensionPrompt(profile, topic)

    const { text } = await generateText({
      model: aiModel,
      system: systemPrompt,
      prompt: `Generate the ${mode} exercise for topic: "${topic}"`,
    })

    const data = parseListeningJSON(text)
    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[listening] error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
