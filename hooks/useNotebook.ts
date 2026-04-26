'use client'

import { useCallback, useEffect, useState } from 'react'
import { createEmptyCard, fsrs, Rating, State, type Card } from 'ts-fsrs'
import { useProfile } from '@/hooks/useProfile'
import { Word } from '@/lib/storage/types'

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function wordToCard(word: Word): Card {
  const base = createEmptyCard()
  return {
    ...base,
    due: new Date(word.due),
    stability: word.stability,
    difficulty: word.difficulty,
    elapsed_days: word.elapsed_days,
    scheduled_days: word.scheduled_days,
    reps: word.reps,
    lapses: word.lapses,
    state: word.state,
    last_review: word.last_review ? new Date(word.last_review) : undefined,
  }
}

export function useNotebook() {
  // Get storage from the shared ProfileContext so it always reflects
  // the current auth state (LocalStorageAdapter vs SupabaseAdapter).
  const { storage, loaded: profileLoaded } = useProfile()

  const [words, setWords] = useState<Word[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const all = await storage.getWords()
    setWords(all)
    setLoading(false)
  }, [storage])

  // Re-fetch whenever storage switches (login / logout)
  useEffect(() => {
    if (profileLoaded) refresh()
  }, [refresh, profileLoaded])

  const addWord = useCallback(
    async (data: Pick<Word, 'word' | 'meaning' | 'phonetic' | 'example' | 'notes' | 'tags'>) => {
      const card = createEmptyCard()
      const word: Word = {
        id: generateId(),
        ...data,
        createdAt: new Date().toISOString(),
        due: card.due.toISOString(),
        stability: card.stability,
        difficulty: card.difficulty,
        elapsed_days: card.elapsed_days,
        scheduled_days: card.scheduled_days,
        reps: card.reps,
        lapses: card.lapses,
        state: card.state,
      }
      await storage.saveWord(word)
      await refresh()
      return word
    },
    [storage, refresh]
  )

  const removeWord = useCallback(
    async (id: string) => {
      await storage.deleteWord(id)
      await refresh()
    },
    [storage, refresh]
  )

  const reviewWord = useCallback(
    async (id: string, rating: Rating.Again | Rating.Hard | Rating.Good | Rating.Easy) => {
      const word = await storage.getWord(id)
      if (!word) return

      const f = fsrs()
      const card = wordToCard(word)
      const scheduling = f.repeat(card, new Date())
      const next = scheduling[rating].card

      await storage.updateWord(id, {
        due: next.due.toISOString(),
        stability: next.stability,
        difficulty: next.difficulty,
        elapsed_days: next.elapsed_days,
        scheduled_days: next.scheduled_days,
        reps: next.reps,
        lapses: next.lapses,
        state: next.state,
        last_review: new Date().toISOString(),
      })
      await refresh()
    },
    [storage, refresh]
  )

  const dueWords = words.filter((w) => new Date(w.due) <= new Date())
  const newWords = words.filter((w) => w.state === State.New)

  return {
    words,
    dueWords,
    newWords,
    loading,
    addWord,
    removeWord,
    reviewWord,
    refresh,
  }
}
