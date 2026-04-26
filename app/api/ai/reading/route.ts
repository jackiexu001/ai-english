import { generateText } from 'ai'
import { NextRequest, NextResponse } from 'next/server'
import { createModel } from '@/lib/ai/factory'
import { AIProvider } from '@/lib/ai/types'
import { readingSystemPrompt, readingUserPrompt } from '@/lib/prompts/templates'
import { UserProfile } from '@/lib/storage/types'

function parseReadingJSON(raw: string): unknown {
  let s = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  const start = s.indexOf('{')
  const end = s.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) s = s.slice(start, end + 1)
  // Fix unquoted phonetics
  s = s.replace(/("phonetic")\s*:\s*\/([^/\n]*)\//g, '$1: "/$2/"')
  try {
    return JSON.parse(s)
  } catch (e) {
    console.error('[reading] JSON.parse failed. Cleaned output:', s.slice(0, 400))
    throw e
  }
}

export async function POST(req: NextRequest) {
  try {
    const { topic, provider, apiKey, model, profile }: {
      topic: string
      provider: AIProvider
      apiKey: string
      model?: string
      profile: UserProfile
    } = await req.json()

    if (!apiKey) return NextResponse.json({ error: 'API key 为空，请在设置中填写' }, { status: 400 })
    if (!topic)   return NextResponse.json({ error: 'Topic is required' }, { status: 400 })

    console.log(`[reading] provider=${provider} topic=${topic}`)

    const aiModel = createModel({ provider, apiKey, model })
    const { text } = await generateText({
      model: aiModel,
      system: readingSystemPrompt(profile),
      prompt: readingUserPrompt(topic),
    })

    const data = parseReadingJSON(text)
    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[reading] error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
