import { streamText } from 'ai'
import { NextRequest } from 'next/server'
import { createModel } from '@/lib/ai/factory'
import { AIProvider } from '@/lib/ai/types'
import { conversationSystemPrompt } from '@/lib/prompts/templates'
import { ChatMessage } from '@/lib/ai/types'
import { UserProfile } from '@/lib/storage/types'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    messages,
    provider,
    apiKey,
    model,
    profile,
  }: {
    messages: ChatMessage[]
    provider: AIProvider
    apiKey: string
    model?: string
    profile: UserProfile
  } = body

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key is required' }), {
      status: 400,
    })
  }

  const aiModel = createModel({ provider, apiKey, model })

  const result = streamText({
    model: aiModel,
    system: conversationSystemPrompt(profile),
    messages,
  })

  return result.toTextStreamResponse()
}
