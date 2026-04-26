import { generateText } from 'ai'
import { NextRequest, NextResponse } from 'next/server'
import { createModel } from '@/lib/ai/factory'
import { AIProvider } from '@/lib/ai/types'
import { learnSystemPrompt, learnUserPrompt, LearnMode } from '@/lib/prompts/templates'
import { UserProfile } from '@/lib/storage/types'

/**
 * Robustly parse the LLM's JSON output.
 * Handles common failure modes:
 *   1. Wrapped in ```json ... ``` fences
 *   2. Phonetic values unquoted:  "phonetic": /rɪˈsiːt/  → "phonetic": "/rɪˈsiːt/"
 *   3. Leading/trailing prose around the JSON object
 */
function parseLearnJSON(raw: string): unknown {
  // 1. Strip markdown fences
  let s = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()

  // 2. Extract the outermost JSON object (skip any leading prose)
  const start = s.indexOf('{')
  const end = s.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) {
    s = s.slice(start, end + 1)
  }

  // 3. Fix unquoted phonetic-style values: "key": /.../ → "key": "/.../"\
  //    Matches any JSON string value that starts with / and isn't already quoted.
  s = s.replace(/("(?:phonetic|pronunciation)")\s*:\s*\/([^/\n]*)\//g, '$1: "/$2/"')

  try {
    return JSON.parse(s)
  } catch (e) {
    // Last resort: log the cleaned string so we can debug future edge cases
    console.error('[learn] JSON.parse failed. Cleaned output:', s.slice(0, 300))
    throw e
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      topic,
      count = 8,
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
      return NextResponse.json({ error: `[${provider}] API key 为空，请在设置中填写` }, { status: 400 })
    }
    if (!topic) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 })
    }

    console.log(`[learn] provider=${provider} model=${model ?? 'default'} topic=${topic}`)

    const aiModel = createModel({ provider, apiKey, model })
    const { text } = await generateText({
      model: aiModel,
      system: learnSystemPrompt(profile),
      prompt: learnUserPrompt(topic, count, mode),
    })

    const data = parseLearnJSON(text)
    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[learn] error:', message)
    return NextResponse.json({ error: `[${String((err as {provider?: string}).provider ?? 'AI')}] ${message}` }, { status: 500 })
  }
}
