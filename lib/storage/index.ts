import type { SupabaseClient } from '@supabase/supabase-js'
import { LocalStorageAdapter } from './local'
import { SupabaseAdapter } from './supabase'
import type { StorageAdapter } from './types'

export { LocalStorageAdapter } from './local'
export { SupabaseAdapter } from './supabase'
export type { StorageAdapter, UserProfile, Word } from './types'

/**
 * Returns a SupabaseAdapter when a logged-in session is available,
 * otherwise falls back to LocalStorageAdapter (guest / pre-login).
 *
 * Called inside ProfileProvider on every auth state change.
 */
export function createStorage(supabase?: SupabaseClient, userId?: string): StorageAdapter {
  if (supabase && userId) return new SupabaseAdapter(supabase, userId)
  return new LocalStorageAdapter()
}
