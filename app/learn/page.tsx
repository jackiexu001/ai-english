'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Volume2, BookmarkPlus, ChevronDown, ChevronUp, Link2 } from 'lucide-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useProfile } from '@/hooks/useProfile'
import { useNotebook } from '@/hooks/useNotebook'
import { useSpeech } from '@/hooks/useSpeech'
import { useStreamObject } from '@/hooks/useStreamObject'
import { LearnMode } from '@/lib/prompts/templates'
import type { LearnItem, LearnResult } from '@/lib/ai/schemas'

const QUICK_TOPICS = [
  '日常问候', '职场英语', '旅行出行', '购物消费',
  '饮食美食', '健康运动', '科技词汇', '情绪表达',
]

const MODES: { value: LearnMode; label: string; desc: string }[] = [
  { value: 'words',    label: '词汇',   desc: '实用单词' },
  { value: 'phrases',  label: '短语',   desc: '地道表达' },
  { value: 'idioms',   label: '习语',   desc: '惯用语' },
  { value: 'business', label: '商务',   desc: '职场英语' },
]

export default function LearnPage() {
  const { profile, activeKey, loaded } = useProfile()
  const { addWord } = useNotebook()
  const { speak, speaking } = useSpeech()

  const [topic, setTopic] = useState('')
  const [mode, setMode] = useState<LearnMode>('words')
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})
  const [saved, setSaved] = useState<Record<number, boolean>>({})

  const { submit, object: result, isLoading: loading } = useStreamObject<LearnResult>({
    api: '/api/ai/learn',
    onError: (e) => toast.error(e.message),
  })

  const generate = (t?: string) => {
    const finalTopic = t ?? topic
    if (!finalTopic.trim()) return toast.error('请输入学习主题')
    if (!loaded) return
    if (!activeKey) return toast.error('请先在设置中配置 API Key')

    setSaved({})
    setExpanded({})
    submit({
      topic: finalTopic,
      count: 10,
      mode,
      provider: profile.preferredProvider,
      apiKey: activeKey,
      profile,
    })
  }

  const saveWord = async (item: LearnItem, idx: number) => {
    await addWord({
      word: item.word,
      phonetic: item.phonetic,
      meaning: item.meaning,
      example: item.example,
    })
    setSaved((prev) => ({ ...prev, [idx]: true }))
    toast.success(`"${item.word}" 已加入生词本`)
  }

  const items = result?.items ?? []

  return (
    <AppShell title="AI 学习">
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Input */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">选择学习主题</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              {MODES.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMode(m.value)}
                  className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                    mode === m.value
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border hover:bg-muted text-muted-foreground'
                  }`}
                >
                  <div>{m.label}</div>
                  <div className="text-xs font-normal opacity-70">{m.desc}</div>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="输入任意主题，例如：商务谈判、影视英语..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && generate()}
              />
              <Button onClick={() => generate()} disabled={loading} className="shrink-0">
                <Sparkles size={15} className="mr-1.5" />
                {loading ? '生成中...' : '生成'}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {QUICK_TOPICS.map((t) => (
                <Badge
                  key={t}
                  variant="outline"
                  className="cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => { setTopic(t); generate(t) }}
                >
                  {t}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Loading spinner — hides as soon as first field arrives */}
        {loading && !result?.title && (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="mr-3"
            >
              <Sparkles size={20} />
            </motion.div>
            AI 正在为你生成个性化内容...
          </div>
        )}

        {/* Title + count badge — appears as soon as title streams in */}
        {result?.title && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <h2 className="font-semibold text-lg">{result.title}</h2>
            <Badge variant="secondary">
              {items.length} 个{MODES.find(m => m.value === mode)?.label ?? '词'}
              {loading && <span className="ml-1 opacity-60">...</span>}
            </Badge>
          </motion.div>
        )}

        {/* Items — render progressively as they stream in */}
        <AnimatePresence>
          {items.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-lg">{item.word}</span>
                        {item.phonetic && (
                          <span className="text-muted-foreground text-sm font-mono">{item.phonetic}</span>
                        )}
                        {item.partOfSpeech && (
                          <Badge variant="outline" className="text-xs">{item.partOfSpeech}</Badge>
                        )}
                        {item.register && (
                          <Badge variant="secondary" className="text-xs">
                            {item.register === 'formal' ? '正式' : item.register === 'informal' ? '非正式' : '中性'}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm mt-0.5 text-foreground font-medium">{item.meaning}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => speak(item.word)} disabled={speaking}>
                        <Volume2 size={14} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => saveWord(item, idx)} disabled={saved[idx]}>
                        <BookmarkPlus size={14} className={saved[idx] ? 'text-blue-500' : ''} />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8"
                        onClick={() => setExpanded((prev) => ({ ...prev, [idx]: !prev[idx] }))}
                      >
                        {expanded[idx] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </Button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {expanded[idx] && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 space-y-2 overflow-hidden"
                      >
                        {/* Example sentence */}
                        <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                          <div className="flex items-start gap-1.5">
                            <button type="button" onClick={() => speak(item.example)} disabled={speaking} className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground">
                              <Volume2 size={13} />
                            </button>
                            <p className="italic text-muted-foreground">{item.example}</p>
                          </div>
                          <p className="text-xs pl-5">{item.exampleTranslation}</p>
                        </div>

                        {/* Collocations */}
                        {(item.collocations?.length ?? 0) > 0 && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Link2 size={11} /> 常用搭配：
                            </span>
                            {(item.collocations ?? []).map((c, ci) => (
                              <Badge key={ci} variant="secondary" className="text-xs font-mono">{c}</Badge>
                            ))}
                          </div>
                        )}

                        {/* Word family */}
                        {item.wordFamily && (
                          <p className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 rounded px-2 py-1.5">
                            🔤 词族：{item.wordFamily}
                          </p>
                        )}

                        {/* Common mistakes */}
                        {item.commonMistakes && (
                          <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded px-2 py-1.5">
                            ⚠️ 常见错误：{item.commonMistakes}
                          </p>
                        )}

                        {/* Mnemonic */}
                        {item.mnemonic && (
                          <p className="text-xs text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30 rounded px-2 py-1.5">
                            🧠 {item.mnemonic}
                          </p>
                        )}

                        {/* Tips */}
                        {item.tips && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 pl-1">
                            💡 {item.tips}
                          </p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Summary — shows when stream finishes */}
        {result?.summary && !loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card className="bg-muted/30">
              <CardContent className="pt-4 pb-3 text-sm text-muted-foreground">
                <strong className="text-foreground">总结：</strong>
                {result.summary}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </AppShell>
  )
}
