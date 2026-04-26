'use client'

import { ProfileProvider } from '@/contexts/profile-context'

export function Providers({ children }: { children: React.ReactNode }) {
  return <ProfileProvider>{children}</ProfileProvider>
}
