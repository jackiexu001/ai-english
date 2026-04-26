'use client'

import { useCallback, useRef, useState } from 'react'
import { useTTS } from './useTTS'

// Web Speech API types are declared in types/speech.d.ts

export function useSpeech() {
  const { speak: ttsSpeak, speaking, stop: ttsStop } = useTTS()
  const [listening, setListening] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)

  // speak() now routes through useTTS:
  // → OpenAI TTS if user has an OpenAI key (high quality)
  // → Web Speech API fallback otherwise
  const speak = useCallback((text: string) => {
    ttsSpeak(text)
  }, [ttsSpeak])

  const stopSpeaking = useCallback(() => {
    ttsStop()
  }, [ttsStop])

  const listen = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') return reject('Not in browser')
      const SpeechRecognitionAPI =
        window.SpeechRecognition || window.webkitSpeechRecognition
      if (!SpeechRecognitionAPI) return reject('Speech recognition not supported')

      const recognition = new SpeechRecognitionAPI()
      recognition.lang = 'en-US'
      recognition.interimResults = false
      recognition.maxAlternatives = 1

      recognitionRef.current = recognition
      setListening(true)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (e: any) => {
        const transcript = e.results[0][0].transcript
        setListening(false)
        resolve(transcript)
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (e: any) => {
        setListening(false)
        reject(e.error)
      }
      recognition.onend = () => setListening(false)
      recognition.start()
    })
  }, [])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setListening(false)
  }, [])

  return { speak, stopSpeaking, speaking, listen, stopListening, listening }
}
