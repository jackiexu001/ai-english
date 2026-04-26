import { generateText } from 'ai'
import { NextRequest, NextResponse } from 'next/server'
import { createModel } from '@/lib/ai/factory'
import { AIProvider } from '@/lib/ai/types'
import { grammarSystemPrompt } from '@/lib/prompts/templates'
import { UserProfile } from '@/lib/storage/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { text, provider, apiKey, model, profile }: {
      text: string
      provider: AIProvider
      apiKey: string
      model?: string
      profile: UserProfile
    } = body

    if (!apiKey) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 })
    }

    const aiModel = createModel({ provider, apiKey, model })
    const { text: result } = await generateText({
      model: aiModel,
      system: grammarSystemPrompt(profile),
      prompt: `Please analyze and correct this English text:\n\n"${text}"`,
    })

    const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const data = JSON.parse(cleaned)
    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
