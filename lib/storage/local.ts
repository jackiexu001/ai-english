import { StorageAdapter, UserProfile, Word } from './types'

const KEYS = {
  WORDS: 'elp-words',
  PROFILE: 'elp-profile',
  API_KEYS: 'elp-api-keys',
} as const

function read<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, JSON.stringify(value))
}

export class LocalStorageAdapter implements StorageAdapter {
  async getWords(): Promise<Word[]> {
    return read<Word[]>(KEYS.WORDS) ?? []
  }

  async getWord(id: string): Promise<Word | null> {
    const words = await this.getWords()
    return words.find((w) => w.id === id) ?? null
  }

  async saveWord(word: Word): Promise<void> {
    const words = await this.getWords()
    const exists = words.findIndex((w) => w.id === word.id)
    if (exists >= 0) {
      words[exists] = word
    } else {
      words.push(word)
    }
    write(KEYS.WORDS, words)
  }

  async updateWord(id: string, updates: Partial<Word>): Promise<void> {
    const words = await this.getWords()
    const idx = words.findIndex((w) => w.id === id)
    if (idx >= 0) {
      words[idx] = { ...words[idx], ...updates }
      write(KEYS.WORDS, words)
    }
  }

  async deleteWord(id: string): Promise<void> {
    const words = await this.getWords()
    write(
      KEYS.WORDS,
      words.filter((w) => w.id !== id)
    )
  }

  async getProfile(): Promise<UserProfile | null> {
    return read<UserProfile>(KEYS.PROFILE)
  }

  async saveProfile(profile: UserProfile): Promise<void> {
    write(KEYS.PROFILE, profile)
  }

  async getApiKeys(): Promise<Record<string, string>> {
    return read<Record<string, string>>(KEYS.API_KEYS) ?? {}
  }

  async saveApiKeys(keys: Record<string, string>): Promise<void> {
    write(KEYS.API_KEYS, keys)
  }
}
