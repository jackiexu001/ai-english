'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Sparkles, Volume2, BookmarkPlus, CheckCircle2, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useProfile } from '@/hooks/useProfile'
import { useNotebook } from '@/hooks/useNotebook'
import { useSpeech } from '@/hooks/useSpeech'

interface Highlight {
  word: string
  phonetic: string
  meaning: string
  partOfSpeech: string
}

interface Question {
  question: string
  options: string[]
  answer: string
  explanation: string
}

interface ReadingResult {
  title: string
  passage: string
  highlights: Highlight[]
  questions: Question[]
  summary: string
}

const QUICK_TOPICS = [
  '气候变化', '人工智能', '太空探索', '健康饮食',
  '城市生活', '传统文化', '体育精神', '科学发现',
]

// Build a map of word → highlight info (lowercase key for matching)
function buildHighlightMap(highlights: Highlight[]): Map<string, Highlight> {
  const map = new Map<string, Highlight>()
  for (const h of highlights) {
    map.set(h.word.toLowerCase(), h)
  }
  return map
}

// Split passage into tokens, preserving whitespace and punctuation
// so we can highlight specific words inline
function tokenizePassage(text: string): string[] {
  return text.split(/(\s+|[.,!?;:'"()\[\]—–-]+)/).filter(Boolean)
}

export default function ReadingPage() {
  const { profile, activeKey, loaded } = useProfile()
  const { addWord } = useNotebook()
  const { speak, speaking } = useSpeech()

  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ReadingResult | null>(null)
  const [activeWord, setActiveWord] = useState<Highlight | null>(null)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [savedWords, setSavedWords] = useState<Set<string>>(new Set())

  const generate = async (t?: string) => {
    const finalTopic = t ?? topic
    if (!finalTopic.trim()) return toast.error('请输入阅读主题')
    if (!loaded) return
    if (!activeKey) return toast.error('请先在设置中配置 API Key')

    setLoading(true)
    setResult(null)
    setAnswers({})
    setSubmitted(false)
    setActiveWord(null)
    setSavedWords(new Set())

    try {
      const res = await fetch('/api/ai/reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: finalTopic,
          provider: profile.preferredProvider,
          apiKey: activeKey,
          profile,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'API 请求失败')
      }
      const data: ReadingResult = await res.json()
      setResult(data)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '生成失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const saveHighlight = async (h: Highlight) => {
    await addWord({ word: h.word, phonetic: h.phonetic, meaning: h.meaning })
    setSavedWords((prev) => new Set(prev).add(h.word.toLowerCase()))
    toast.success(`"${h.word}" 已加入生词本`)
  }

  const score = (() => {
    if (!result || !submitted) return null
    let correct = 0
    result.questions.forEach((q, i) => {
      if (answers[i] === q.answer) correct++
    })
    return correct
  })()

  const highlightMap = result ? buildHighlightMap(result.highlights) : new Map()

  return (
    <AppShell title="阅读理解">
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Topic input */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText size={16} />
              选择阅读主题
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="输入任意主题，例如：可持续发展、人工智能伦理..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && generate()}
              />
              <Button onClick={() => generate()} disabled={loading} className="shrink-0">
                <Sparkles size={15} className="mr-1.5" />
                {loading ? '生成中...' : '生成文章'}
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

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="mr-3"
            >
              <Sparkles size={20} />
            </motion.div>
            AI 正在生成文章和题目...
          </div>
        )}

        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-5"
            >
              {/* Passage */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg leading-snug">{result.title}</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={speaking}
                      onClick={() => speak(result.passage)}
                      className="shrink-0"
                    >
                      <Volume2 size={14} className="mr-1.5" />
                      朗读
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-7 text-foreground">
                    {tokenizePassage(result.passage).map((token, i) => {
                      const key = token.toLowerCase().replace(/[^a-z'-]/g, '')
                      const hl = highlightMap.get(key)
                      if (hl) {
                        return (
                          <span
                            key={i}
                            className="underline decoration-dotted decoration-primary cursor-pointer text-primary hover:bg-primary/10 rounded px-0.5 transition-colors"
                            onClick={() => setActiveWord(activeWord?.word === hl.word ? null : hl)}
                          >
                            {token}
                          </span>
                        )
                      }
                      return <span key={i}>{token}</span>
                    })}
                  </p>

                  {/* Word tooltip */}
                  <AnimatePresence>
                    {activeWord && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        className="mt-4 p-3 rounded-xl border border-primary/20 bg-primary/5 flex items-start justify-between gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold">{activeWord.word}</span>
                            <span className="text-muted-foreground text-xs font-mono">{activeWord.phonetic}</span>
                            <Badge variant="outline" className="text-xs">{activeWord.partOfSpeech}</Badge>
                          </div>
                          <p className="text-sm mt-0.5">{activeWord.meaning}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => speak(activeWord.word)}
                            disabled={speaking}
                          >
                            <Volume2 size={13} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            disabled={savedWords.has(activeWord.word.toLowerCase())}
                            onClick={() => saveHighlight(activeWord)}
                          >
                            <BookmarkPlus
                              size={13}
                              className={savedWords.has(activeWord.word.toLowerCase()) ? 'text-blue-500' : ''}
                            />
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <p className="mt-4 text-xs text-muted-foreground border-t pt-3">
                    💡 点击文中蓝色下划线单词可查看释义，并一键加入生词本
                  </p>
                </CardContent>
              </Card>

              {/* Vocabulary list */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">重点词汇 ({result.highlights.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {result.highlights.map((h, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-sm">{h.word}</span>
                            <span className="text-xs text-muted-foreground font-mono">{h.phonetic}</span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{h.meaning}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => speak(h.word)}
                            disabled={speaking}
                          >
                            <Volume2 size={12} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            disabled={savedWords.has(h.word.toLowerCase())}
                            onClick={() => saveHighlight(h)}
                          >
                            <BookmarkPlus
                              size={12}
                              className={savedWords.has(h.word.toLowerCase()) ? 'text-blue-500' : ''}
                            />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Questions */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">理解测验</CardTitle>
                    {submitted && score !== null && (
                      <Badge variant={score >= 3 ? 'default' : 'destructive'}>
                        {score} / {result.questions.length} 题正确
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  {result.questions.map((q, qi) => (
                    <div key={qi} className="space-y-2">
                      <p className="text-sm font-medium">
                        {qi + 1}. {q.question}
                      </p>
                      <div className="grid grid-cols-1 gap-1.5">
                        {q.options.map((opt, oi) => {
                          const letter = opt.charAt(0)
                          const isSelected = answers[qi] === letter
                          const isCorrect = submitted && letter === q.answer
                          const isWrong = submitted && isSelected && letter !== q.answer

                          return (
                            <button
                              key={oi}
                              type="button"
                              disabled={submitted}
                              onClick={() => setAnswers((prev) => ({ ...prev, [qi]: letter }))}
                              className={`text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                                isCorrect
                                  ? 'border-green-500 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300'
                                  : isWrong
                                  ? 'border-red-400 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300'
                                  : isSelected
                                  ? 'border-primary bg-primary/5'
                                  : 'border-border hover:bg-muted'
                              }`}
                            >
                              <span className="flex items-center gap-2">
                                {submitted && isCorrect && <CheckCircle2 size={13} className="text-green-500 shrink-0" />}
                                {submitted && isWrong && <XCircle size={13} className="text-red-500 shrink-0" />}
                                {opt}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                      {submitted && (
                        <p className="text-xs text-muted-foreground pl-1">
                          {q.explanation}
                        </p>
                      )}
                    </div>
                  ))}

                  {!submitted ? (
                    <Button
                      onClick={() => setSubmitted(true)}
                      disabled={Object.keys(answers).length < result.questions.length}
                      className="w-full"
                    >
                      提交答案
                    </Button>
                  ) : (
                    <div className="text-center text-sm text-muted-foreground py-1">
                      {score === result.questions.length
                        ? '🎉 全部答对，太厉害了！'
                        : score! >= Math.ceil(result.questions.length / 2)
                        ? '👍 答对过半，继续加油！'
                        : '💪 不错的尝试，多读几遍文章再试试！'}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Summary */}
              <Card className="bg-muted/30">
                <CardContent className="pt-4 pb-3 text-sm text-muted-foreground">
                  <strong className="text-foreground">文章主旨：</strong>
                  {result.summary}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  )
}
