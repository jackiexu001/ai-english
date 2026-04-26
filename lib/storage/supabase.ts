import type { SupabaseClient } from '@supabase/supabase-js'
import { State } from 'ts-fsrs'
import type { StorageAdapter, UserProfile, Word } from './types'

// ─── Field mapping ────────────────────────────────────────────────────────────
// DB uses snake_case columns; Word interface uses camelCase / original field names.

type DbWord = {
  id: string
  user_id: string
  word: string
  phonetic: string | null
  meaning: string
  example: string | null
  notes: string | null
  tags: string[] | null
  created_at: string
  due: string
  stability: number
  difficulty: number
  elapsed_days: number
  scheduled_days: number
  reps: number
  lapses: number
  state: number
  last_review: string | null
}

type DbProfile = {
  id: string
  age_group: string
  level: string
  native_language: string
  preferred_provider: string
  display_name: string | null
  tts_voice: string | null
  tts_speed: number | null
  updated_at: string
}

type DbApiKeys = {
  user_id: string
  keys: Record<string, string>
}

function dbToWord(row: DbWord): Word {
  return {
    id: row.id,
    word: row.word,
    phonetic: row.phonetic ?? undefined,
    meaning: row.meaning,
    example: row.example ?? undefined,
    notes: row.notes ?? undefined,
    tags: row.tags ?? undefined,
    createdAt: row.created_at,
    due: row.due,
    stability: row.stability,
    difficulty: row.difficulty,
    elapsed_days: row.elapsed_days,
    scheduled_days: row.scheduled_days,
    reps: row.reps,
    lapses: row.lapses,
    state: row.state as State,
    last_review: row.last_review ?? undefined,
  }
}

function wordToDb(word: Word, userId: string): Omit<DbWord, 'user_id'> & { user_id: string } {
  return {
    id: word.id,
    user_id: userId,
    word: word.word,
    phonetic: word.phonetic ?? null,
    meaning: word.meaning,
    example: word.example ?? null,
    notes: word.notes ?? null,
    tags: word.tags ?? null,
    created_at: word.createdAt,
    due: word.due,
    stability: word.stability,
    difficulty: word.difficulty,
    elapsed_days: word.elapsed_days,
    scheduled_days: word.scheduled_days,
    reps: word.reps,
    lapses: word.lapses,
    state: word.state as number,
    last_review: word.last_review ?? null,
  }
}

function dbToProfile(row: DbProfile): UserProfile {
  return {
    ageGroup: row.age_group as UserProfile['ageGroup'],
    level: row.level as UserProfile['level'],
    nativeLanguage: row.native_language as UserProfile['nativeLanguage'],
    preferredProvider: row.preferred_provider,
    displayName: row.display_name ?? undefined,
    ttsVoice: row.tts_voice ?? undefined,
    ttsSpeed: row.tts_speed ?? undefined,
  }
}

function profileToDb(profile: UserProfile, userId: string): Omit<DbProfile, 'updated_at'> {
  return {
    id: userId,
    age_group: profile.ageGroup,
    level: profile.level,
    native_language: profile.nativeLanguage,
    preferred_provider: profile.preferredProvider,
    display_name: profile.displayName ?? null,
    tts_voice: profile.ttsVoice ?? null,
    tts_speed: profile.ttsSpeed ?? null,
  }
}

// ─── SupabaseAdapter ──────────────────────────────────────────────────────────

export class SupabaseAdapter implements StorageAdapter {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly userId: string
  ) {}

  // ── Words ──────────────────────────────────────────────────────────────────

  async getWords(): Promise<Word[]> {
    const { data, error } = await this.supabase
      .from('words')
      .select('*')
      .eq('user_id', this.userId)
      .order('created_at', { ascending: false })
    if (error) throw new Error(`getWords: ${error.message}`)
    return (data as DbWord[]).map(dbToWord)
  }

  async getWord(id: string): Promise<Word | null> {
    const { data, error } = await this.supabase
      .from('words')
      .select('*')
      .eq('id', id)
      .eq('user_id', this.userId)
      .single()
    if (error) return null
    return dbToWord(data as DbWord)
  }

  async saveWord(word: Word): Promise<void> {
    const { error } = await this.supabase
      .from('words')
      .upsert(wordToDb(word, this.userId), { onConflict: 'id' })
    if (error) throw new Error(`saveWord: ${error.message}`)
  }

  async updateWord(id: string, updates: Partial<Word>): Promise<void> {
    const word = await this.getWord(id)
    if (!word) return
    await this.saveWord({ ...word, ...updates })
  }

  async deleteWord(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('words')
      .delete()
      .eq('id', id)
      .eq('user_id', this.userId)
    if (error) throw new Error(`deleteWord: ${error.message}`)
  }

  // ── Profile ────────────────────────────────────────────────────────────────

  async getProfile(): Promise<UserProfile | null> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', this.userId)
      .single()
    if (error || !data) return null
    return dbToProfile(data as DbProfile)
  }

  async saveProfile(profile: UserProfile): Promise<void> {
    const { error } = await this.supabase
      .from('profiles')
      .upsert({ ...profileToDb(profile, this.userId), updated_at: new Date().toISOString() })
    if (error) throw new Error(`saveProfile: ${error.message}`)
  }

  // ── API Keys ───────────────────────────────────────────────────────────────

  async getApiKeys(): Promise<Record<string, string>> {
    const { data, error } = await this.supabase
      .from('api_keys')
      .select('keys')
      .eq('user_id', this.userId)
      .single()
    if (error || !data) return {}
    return (data as DbApiKeys).keys ?? {}
  }

  async saveApiKeys(keys: Record<string, string>): Promise<void> {
    const { error } = await this.supabase
      .from('api_keys')
      .upsert({ user_id: this.userId, keys, updated_at: new Date().toISOString() })
    if (error) throw new Error(`saveApiKeys: ${error.message}`)
  }
}
