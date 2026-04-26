import { State } from 'ts-fsrs'

export interface Word {
  id: string
  word: string
  phonetic?: string
  meaning: string          // 中文释义
  example?: string         // 例句
  notes?: string           // 用户自定义笔记
  tags?: string[]
  createdAt: string        // ISO string
  // FSRS spaced repetition fields
  due: string              // ISO string — next review date
  stability: number
  difficulty: number
  elapsed_days: number
  scheduled_days: number
  reps: number
  lapses: number
  state: State
  last_review?: string     // ISO string
}

export interface UserProfile {
  ageGroup: 'teens' | 'adults'
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
  nativeLanguage: 'zh' | 'en' | 'ja' | 'ko'
  preferredProvider: string
  displayName?: string
  ttsVoice?: string   // OpenAI TTS voice: alloy | echo | fable | onyx | nova | shimmer
  ttsSpeed?: number   // 0.5 – 2.0
}

export interface StorageAdapter {
  // Words
  getWords(): Promise<Word[]>
  getWord(id: string): Promise<Word | null>
  saveWord(word: Word): Promise<void>
  updateWord(id: string, updates: Partial<Word>): Promise<void>
  deleteWord(id: string): Promise<void>
  // Profile
  getProfile(): Promise<UserProfile | null>
  saveProfile(profile: UserProfile): Promise<void>
  // API Keys
  getApiKeys(): Promise<Record<string, string>>
  saveApiKeys(keys: Record<string, string>): Promise<void>
}
