'use client'

import { useCallback, useRef, useState } from 'react'
import { useProfile } from '@/hooks/useProfile'

type TTSProvider = 'openai' | 'minimax' | 'glm'

let currentAudio: HTMLAudioElement | null = null

/** Pick the best available TTS provider from the user's configured keys. */
function resolveTTSProvider(apiKeys: Record<string, string>): { provider: TTSProvider; apiKey: string } | null {
  if (apiKeys['openai']?.trim())   return { provider: 'openai',  apiKey: apiKeys['openai'].trim() }
  if (apiKeys['minimax']?.trim()) return { provider: 'minimax', apiKey: apiKeys['minimax'].trim() }
  if (apiKeys['glm']?.trim())     return { provider: 'glm',     apiKey: apiKeys['glm'].trim() }
  return null
}

export function useTTS() {
  const { apiKeys, profile } = useProfile()
  const [speaking, setSpeaking] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const stop = useCallback(() => {
    if (currentAudio) {
      currentAudio.pause()
      currentAudio.src = ''
      currentAudio = null
    }
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel()
    abortRef.current?.abort()
    setSpeaking(false)
  }, [])

  const speak = useCallback(
    async (text: string) => {
      if (!text.trim()) return
      stop()

      const resolved = resolveTTSProvider(apiKeys)

      if (resolved) {
        // ── API-based TTS (OpenAI / MiniMax / GLM) ────────────────────────
        setSpeaking(true)
        abortRef.current = new AbortController()
        try {
          const res = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text,
              voice: profile.ttsVoice ?? 'nova',
              speed: profile.ttsSpeed ?? 1.0,
              apiKey: resolved.apiKey,
              ttsProvider: resolved.provider,
            }),
            signal: abortRef.current.signal,
          })

          if (!res.ok) {
            // API failed → fall back to Web Speech
            webSpeechFallback(text, profile.ttsSpeed ?? 1.0, () => setSpeaking(false))
            return
          }

          const blob = await res.blob()
          const url = URL.createObjectURL(blob)
          const audio = new Audio(url)
          currentAudio = audio
          audio.onended = () => { URL.revokeObjectURL(url); currentAudio = null; setSpeaking(false) }
          audio.onerror = () => { URL.revokeObjectURL(url); currentAudio = null; setSpeaking(false) }
          audio.play()
        } catch (err) {
          if ((err as { name?: string }).name !== 'AbortError') {
            webSpeechFallback(text, profile.ttsSpeed ?? 1.0, () => setSpeaking(false))
          } else {
            setSpeaking(false)
          }
        }
      } else {
        // ── Web Speech API fallback (no API keys configured) ──────────────
        setSpeaking(true)
        webSpeechFallback(text, profile.ttsSpeed ?? 1.0, () => setSpeaking(false))
      }
    },
    [apiKeys, profile.ttsVoice, profile.ttsSpeed, stop]
  )

  /** Which TTS backend will be used, for display in Settings. */
  const activeTTSProvider = resolveTTSProvider(apiKeys)?.provider ?? 'browser'

  return { speak, speaking, stop, activeTTSProvider }
}

function webSpeechFallback(text: string, rate: number, onEnd: () => void) {
  if (typeof window === 'undefined' || !window.speechSynthesis) { onEnd(); return }
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'en-US'
  utterance.rate = rate
  utterance.onend = onEnd
  utterance.onerror = onEnd
  window.speechSynthesis.speak(utterance)
}
