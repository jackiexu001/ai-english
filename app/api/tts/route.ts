import { NextRequest, NextResponse } from 'next/server'

const OPENAI_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] as const

// MiniMax voices suitable for English content
const MINIMAX_VOICES: Record<string, string> = {
  alloy:   'male-qn-qingse',
  echo:    'male-qn-badao',
  fable:   'female-yujie',
  onyx:    'male-qn-jingying',
  nova:    'female-tianmei-jingpin',
  shimmer: 'female-shaonv',
}

type TTSProvider = 'openai' | 'minimax' | 'glm'

export async function POST(req: NextRequest) {
  try {
    const { text, voice = 'nova', speed = 1.0, apiKey, ttsProvider } = await req.json() as {
      text: string
      voice?: string
      speed?: number
      apiKey: string
      ttsProvider: TTSProvider
    }

    if (!apiKey?.trim()) {
      return NextResponse.json({ error: 'API key required' }, { status: 400 })
    }
    if (!text?.trim()) {
      return NextResponse.json({ error: 'Text required' }, { status: 400 })
    }

    const safeSpeed = Math.min(4.0, Math.max(0.25, speed))

    switch (ttsProvider) {
      case 'openai':
        return await openaiTTS(text, voice, safeSpeed, apiKey)
      case 'minimax':
        return await minimaxTTS(text, voice, safeSpeed, apiKey)
      case 'glm':
        return await glmTTS(text, voice, safeSpeed, apiKey)
      default:
        return NextResponse.json({ error: `Unsupported TTS provider: ${ttsProvider}` }, { status: 400 })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ─── OpenAI TTS ───────────────────────────────────────────────────────────────

async function openaiTTS(text: string, voice: string, speed: number, apiKey: string) {
  const safeVoice = OPENAI_VOICES.includes(voice as typeof OPENAI_VOICES[number]) ? voice : 'nova'

  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'tts-1', input: text, voice: safeVoice, speed }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    return NextResponse.json(
      { error: err?.error?.message ?? `OpenAI TTS failed: ${res.statusText}` },
      { status: res.status }
    )
  }

  const buffer = await res.arrayBuffer()
  return new NextResponse(buffer, {
    headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=3600' },
  })
}

// ─── MiniMax TTS ──────────────────────────────────────────────────────────────

async function minimaxTTS(text: string, voice: string, speed: number, apiKey: string) {
  const voiceId = MINIMAX_VOICES[voice] ?? MINIMAX_VOICES['nova']

  const res = await fetch('https://api.minimax.chat/v1/t2a_v2', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'speech-01-hd',
      text,
      stream: false,
      voice_setting: { voice_id: voiceId, speed, vol: 1.0, pitch: 0 },
      audio_setting: { sample_rate: 32000, bitrate: 128000, format: 'mp3' },
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    return NextResponse.json(
      { error: err?.base_resp?.status_msg ?? `MiniMax TTS failed: ${res.statusText}` },
      { status: res.status }
    )
  }

  const data = await res.json()
  const hexAudio = data?.data?.audio
  if (!hexAudio) {
    return NextResponse.json({ error: 'MiniMax TTS: no audio in response' }, { status: 500 })
  }

  // MiniMax returns hex-encoded MP3
  const buffer = Buffer.from(hexAudio, 'hex')
  return new NextResponse(buffer, {
    headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=3600' },
  })
}

// ─── GLM (智谱) TTS ───────────────────────────────────────────────────────────

async function glmTTS(text: string, voice: string, speed: number, apiKey: string) {
  // GLM uses OpenAI-compatible audio endpoint
  const res = await fetch('https://open.bigmodel.cn/api/paas/v4/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'cogspk-3',
      input: text,
      voice: voice === 'nova' || voice === 'shimmer' ? 'female' : 'male',
      speed,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    return NextResponse.json(
      { error: err?.error?.message ?? `GLM TTS failed: ${res.statusText}` },
      { status: res.status }
    )
  }

  const buffer = await res.arrayBuffer()
  return new NextResponse(buffer, {
    headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=3600' },
  })
}
