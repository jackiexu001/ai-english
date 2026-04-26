'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { createStorage } from '@/lib/storage'
import type { StorageAdapter, UserProfile } from '@/lib/storage/types'
import { AIProvider } from '@/lib/ai/types'

// ─── Types ────────────────────────────────────────────────────────────────────

const DEFAULT_PROFILE: UserProfile = {
  ageGroup: 'adults',
  level: 'B1',
  nativeLanguage: 'zh',
  preferredProvider: AIProvider.OpenAI,
}

interface ProfileContextValue {
  profile: UserProfile
  apiKeys: Record<string, string>
  activeKey: string
  availableProviders: string[]
  loaded: boolean
  user: User | null                    // null = not logged in
  supabase: SupabaseClient
  storage: StorageAdapter
  updateProfile: (updates: Partial<UserProfile>) => void
  updateApiKeys: (keys: Record<string, string>) => Promise<void>
  signOut: () => Promise<void>
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ProfileContext = createContext<ProfileContextValue | null>(null)

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), [])

  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE)
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({})
  const [loaded, setLoaded] = useState(false)

  // Keep a mutable ref so callbacks always have the current storage instance
  // without needing to re-create callbacks on every auth change.
  const storageRef = useRef<StorageAdapter>(createStorage())

  // ── Load data from storage ─────────────────────────────────────────────────

  const loadData = useCallback(
    async (adapter: StorageAdapter) => {
      setLoaded(false)
      const [savedProfile, savedKeys] = await Promise.all([
        adapter.getProfile(),
        adapter.getApiKeys(),
      ])

      const keys = savedKeys ?? {}
      let resolvedProfile = savedProfile ?? DEFAULT_PROFILE

      // Auto-correct preferred provider if its key is missing
      if (!keys[resolvedProfile.preferredProvider]?.trim()) {
        const firstAvailable = Object.entries(keys).find(([, v]) => v?.trim())?.[0]
        if (firstAvailable) {
          resolvedProfile = { ...resolvedProfile, preferredProvider: firstAvailable }
          adapter.saveProfile(resolvedProfile)
        }
      }

      setProfile(resolvedProfile)
      setApiKeys(keys)
      setLoaded(true)
    },
    []
  )

  // ── Auth state listener ────────────────────────────────────────────────────

  useEffect(() => {
    // Load initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      const adapter = createStorage(
        currentUser ? supabase : undefined,
        currentUser?.id
      )
      storageRef.current = adapter
      loadData(adapter)
    })

    // Listen for login / logout
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const currentUser = session?.user ?? null
        setUser(currentUser)
        const adapter = createStorage(
          currentUser ? supabase : undefined,
          currentUser?.id
        )
        storageRef.current = adapter
        loadData(adapter)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase, loadData])

  // ── Mutations ──────────────────────────────────────────────────────────────

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...updates }
      storageRef.current.saveProfile(next)
      return next
    })
  }, [])

  const updateApiKeys = useCallback(async (keys: Record<string, string>) => {
    setApiKeys(keys)
    await storageRef.current.saveApiKeys(keys)

    setProfile((prev) => {
      if (!keys[prev.preferredProvider]?.trim()) {
        const firstAvailable = Object.entries(keys).find(([, v]) => v?.trim())?.[0]
        if (firstAvailable) {
          const next = { ...prev, preferredProvider: firstAvailable }
          storageRef.current.saveProfile(next)
          return next
        }
      }
      return prev
    })
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    // onAuthStateChange will fire and reset everything
  }, [supabase])

  // ── Derived values ─────────────────────────────────────────────────────────

  const availableProviders = useMemo(
    () => Object.entries(apiKeys).filter(([, v]) => v?.trim()).map(([k]) => k),
    [apiKeys]
  )

  const activeKey = apiKeys[profile.preferredProvider]?.trim() ?? ''

  const value = useMemo<ProfileContextValue>(
    () => ({
      profile,
      apiKeys,
      activeKey,
      availableProviders,
      loaded,
      user,
      supabase,
      storage: storageRef.current,
      updateProfile,
      updateApiKeys,
      signOut,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile, apiKeys, activeKey, availableProviders, loaded, user, updateProfile, updateApiKeys, signOut]
  )

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider')
  return ctx
}
