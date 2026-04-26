import { generateText } from 'ai'
import { NextRequest, NextResponse } from 'next/server'
import { createModel } from '@/lib/ai/factory'
import { AIProvider } from '@/lib/ai/types'

/** Translate common provider error messages into user-friendly Chinese. */
function friendlyError(message: string): string {
  if (message.includes('Quota exceeded') || message.includes('quota')) {
    return 'API 配额已用完。Gemini 免费版请前往 https://aistudio.google.com 确认项目已启用计费，或等待配额重置。'
  }
  if (message.includes('API key') || message.includes('api_key') || message.includes('Unauthorized') || message.includes('401')) {
    return 'API Key 无效或已过期，请检查后重新填写。'
  }
  if (message.includes('404') || message.includes('Not Found')) {
    return '接口地址错误（404）。请确认 API Key 对应的服务商正确。'
  }
  if (message.includes('rate limit') || message.includes('429')) {
    return '请求过于频繁（限速），请稍等片刻再重试。'
  }
  return message
}

export async function POST(req: NextRequest) {
  try {
    const { provider, apiKey, model } = await req.json() as {
      provider: AIProvider
      apiKey: string
      model?: string
    }

    if (!apiKey?.trim()) {
      return NextResponse.json({ ok: false, error: 'API key 为空' }, { status: 400 })
    }

    console.log(`[test] provider=${provider}`)
    const aiModel = createModel({ provider, apiKey, model })

    const { text } = await generateText({
      model: aiModel,
      prompt: 'Reply with exactly the word: OK',
      maxOutputTokens: 10,
    })

    console.log(`[test] success provider=${provider} reply=${text.trim()}`)
    return NextResponse.json({ ok: true, reply: text.trim() })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[test] error:', message)
    return NextResponse.json({ ok: false, error: friendlyError(message) }, { status: 500 })
  }
}
