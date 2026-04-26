import { generateText } from 'ai'
import { NextRequest, NextResponse } from 'next/server'
import { createModel } from '@/lib/ai/factory'
import { AIProvider } from '@/lib/ai/types'
import { quizGeneratePrompt } from '@/lib/prompts/templates'
import { UserProfile } from '@/lib/storage/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { words, mode, provider, apiKey, model, profile }: {
      words: Array<{ word: string; meaning: string }>
      mode: 'mcq' | 'fill'
      provider: AIProvider
      apiKey: string
      model?: string
      profile: UserProfile
    } = body

    if (!apiKey) return NextResponse.json({ error: 'API key required' }, { status: 400 })

    const aiModel = createModel({ provider, apiKey, model })
    const { text } = await generateText({
      model: aiModel,
      prompt: quizGeneratePrompt(words, mode),
    })

    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return NextResponse.json(JSON.parse(cleaned))
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
