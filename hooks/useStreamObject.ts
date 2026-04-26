'use client'

import { useState, useRef, useCallback } from 'react'
import { parsePartialJson } from 'ai'

interface UseStreamObjectOptions<T> {
  api: string
  onError?: (e: Error) => void
  onFinish?: (result: T) => void
}

interface UseStreamObjectReturn<T> {
  submit: (body: Record<string, unknown>) => Promise<void>
  object: Partial<T> | undefined
  isLoading: boolean
  error: Error | undefined
  stop: () => void
}

export function useStreamObject<T>({
  api,
  onError,
  onFinish,
}: UseStreamObjectOptions<T>): UseStreamObjectReturn<T> {
  const [object, setObject] = useState<Partial<T> | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | undefined>(undefined)
  const abortRef = useRef<AbortController | null>(null)

  const stop = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const submit = useCallback(
    async (body: Record<string, unknown>) => {
      abortRef.current?.abort()
      const ctrl = new AbortController()
      abortRef.current = ctrl

      setIsLoading(true)
      setObject(undefined)
      setError(undefined)

      try {
        const res = await fetch(api, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: ctrl.signal,
        })

        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
          throw new Error(errData.error ?? `HTTP ${res.status}`)
        }

        if (!res.body) throw new Error('No response body')

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let accumulated = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          accumulated += decoder.decode(value, { stream: true })
          const { value: parsed, state } = await parsePartialJson(accumulated)
          if (state !== 'failed-parse' && parsed !== undefined) {
            setObject(parsed as Partial<T>)
          }
        }

        // Final parse on stream end
        const { value: final } = await parsePartialJson(accumulated)
        if (final !== undefined) {
          const typed = final as T
          setObject(typed as Partial<T>)
          onFinish?.(typed)
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        const e = err instanceof Error ? err : new Error(String(err))
        setError(e)
        onError?.(e)
      } finally {
        setIsLoading(false)
      }
    },
    [api, onError, onFinish],
  )

  return { submit, object, isLoading, error, stop }
}
