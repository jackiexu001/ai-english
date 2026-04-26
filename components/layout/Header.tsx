'use client'

import { Moon, Sun, Menu } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useProfile } from '@/hooks/useProfile'
import { AI_PROVIDER_LABELS, AIProvider } from '@/lib/ai/types'

export function Header({ title }: { title: string }) {
  const { setTheme, resolvedTheme } = useTheme()
  const { profile, availableProviders, loaded, updateProfile } = useProfile()

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/80 backdrop-blur sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu size={18} />
        </Button>
        <h1 className="font-semibold text-base">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="hidden sm:flex text-xs">
          {profile.level}
        </Badge>

        {/* Provider selector — only shown when at least one key is configured */}
        {loaded && availableProviders.length > 0 && (
          <Select
            value={profile.preferredProvider}
            onValueChange={(v) => updateProfile({ preferredProvider: v ?? profile.preferredProvider })}
          >
            <SelectTrigger className="h-8 text-xs w-auto min-w-[110px] border-dashed">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {availableProviders.map((p) => (
                <SelectItem key={p} value={p} className="text-xs">
                  {AI_PROVIDER_LABELS[p as AIProvider] ?? p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {loaded && availableProviders.length === 0 && (
          <span className="text-xs text-amber-500 hidden sm:block">未配置 API Key</span>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        >
          {resolvedTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </Button>
      </div>
    </header>
  )
}
