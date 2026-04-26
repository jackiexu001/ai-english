'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Sparkles,
  NotebookPen,
  HelpCircle,
  MessageSquare,
  BookOpen,
  Settings,
  ArrowRight,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AppShell } from '@/components/layout/AppShell'
import { useProfile } from '@/hooks/useProfile'
import { useNotebook } from '@/hooks/useNotebook'

const modules = [
  {
    href: '/learn',
    icon: Sparkles,
    title: 'AI 学习',
    description: '根据你的水平，AI 生成个性化单词、短语和句子',
    color: 'text-violet-500',
    bg: 'bg-violet-50 dark:bg-violet-950/30',
  },
  {
    href: '/notebook',
    icon: NotebookPen,
    title: '生词本',
    description: '保存和管理你学过的单词，智能间隔复习',
    color: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
  },
  {
    href: '/quiz',
    icon: HelpCircle,
    title: '测验',
    description: '选择题、填空题四种模式，检验学习成果',
    color: 'text-green-500',
    bg: 'bg-green-50 dark:bg-green-950/30',
  },
  {
    href: '/conversation',
    icon: MessageSquare,
    title: '对话练习',
    description: '和 AI 用英语对话，实时获得纠错和建议',
    color: 'text-orange-500',
    bg: 'bg-orange-50 dark:bg-orange-950/30',
  },
  {
    href: '/grammar',
    icon: BookOpen,
    title: '语法工具',
    description: '输入英文句子，AI 检查语法并给出中文解释',
    color: 'text-rose-500',
    bg: 'bg-rose-50 dark:bg-rose-950/30',
  },
  {
    href: '/settings',
    icon: Settings,
    title: '设置',
    description: '配置你的学习等级、年龄段和 AI 提供商',
    color: 'text-slate-500',
    bg: 'bg-slate-50 dark:bg-slate-950/30',
  },
]

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.4 },
  }),
}

export default function HomePage() {
  const { profile } = useProfile()
  const { words, dueWords } = useNotebook()

  const levelLabel: Record<string, string> = {
    A1: '入门', A2: '基础', B1: '中级', B2: '中高级', C1: '高级', C2: '精通',
  }

  return (
    <AppShell title="首页">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Welcome */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h2 className="text-2xl font-bold tracking-tight">
            你好 👋 继续学习吧
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            当前等级：
            <Badge variant="secondary" className="mx-1">
              {profile.level} · {levelLabel[profile.level]}
            </Badge>
            生词本共 <strong>{words.length}</strong> 个词，今日待复习{' '}
            <strong className="text-orange-500">{dueWords.length}</strong> 个
          </p>
        </motion.div>

        {/* Module grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((mod, i) => (
            <motion.div
              key={mod.href}
              custom={i}
              initial="hidden"
              animate="visible"
              variants={fadeInUp}
            >
              <Link href={mod.href}>
                <Card className="h-full hover:shadow-md transition-shadow cursor-pointer group">
                  <CardHeader className="pb-2">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${mod.bg} mb-1`}>
                      <mod.icon size={20} className={mod.color} />
                    </div>
                    <CardTitle className="text-base flex items-center justify-between">
                      {mod.title}
                      <ArrowRight
                        size={14}
                        className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity -translate-x-1 group-hover:translate-x-0 transition-transform"
                      />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-xs leading-relaxed">
                      {mod.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Quick tip */}
        {!profile.preferredProvider && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-sm"
          >
            ⚠️ 还没有配置 AI 提供商，请先去{' '}
            <Link href="/settings" className="underline font-medium">
              设置页面
            </Link>{' '}
            填入 API Key。
          </motion.div>
        )}
      </div>
    </AppShell>
  )
}
