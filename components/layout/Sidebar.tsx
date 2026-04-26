'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BookOpen,
  MessageSquare,
  NotebookPen,
  Settings,
  Sparkles,
  HelpCircle,
  GraduationCap,
  Headphones,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const nav = [
  { href: '/', label: '首页', icon: GraduationCap },
  { href: '/learn', label: 'AI 学习', icon: Sparkles },
  { href: '/reading', label: '阅读理解', icon: FileText },
  { href: '/listening', label: '听力训练', icon: Headphones },
  { href: '/notebook', label: '生词本', icon: NotebookPen },
  { href: '/quiz', label: '测验', icon: HelpCircle },
  { href: '/conversation', label: '对话练习', icon: MessageSquare },
  { href: '/grammar', label: '语法工具', icon: BookOpen },
  { href: '/settings', label: '设置', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-border bg-sidebar h-screen sticky top-0">
      <div className="px-4 py-5 border-b border-border">
        <span className="font-bold text-lg tracking-tight">英语学习</span>
        <span className="ml-1 text-xs text-muted-foreground">English AI</span>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              pathname === href
                ? 'bg-primary text-primary-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            )}
          >
            <Icon size={17} />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
