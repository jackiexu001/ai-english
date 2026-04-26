'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, XCircle, RotateCcw, Trophy } from 'lucide-react'
import { toast } from 'sonner'
import { Rating } from 'ts-fsrs'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useNotebook } from '@/hooks/useNotebook'
import { useProfile } from '@/hooks/useProfile'

// ─── Flashcard mode ───────────────────────────────────────────────────────────
function FlashcardQuiz() {
  const { dueWords, newWords, reviewWord } = useNotebook()
  const queue = [...dueWords, ...newWords].slice(0, 20)
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [done, setDone] = useState(false)

  if (queue.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Trophy size={40} className="mx-auto mb-3 text-yellow-500" />
        <p className="font-medium text-foreground">今天没有要复习的单词了！</p>
        <p className="text-sm mt-1">去生词本添加更多单词，或等明天再来</p>
      </div>
    )
  }

  if (done || idx >= queue.length) {
    return (
      <div className="text-center py-12">
        <Trophy size={40} className="mx-auto mb-3 text-yellow-500" />
        <p className="text-xl font-bold">复习完成！</p>
        <p className="text-muted-foreground mt-1">共复习了 {queue.length} 个单词</p>
        <Button className="mt-4" onClick={() => { setIdx(0); setFlipped(false); setDone(false) }}>
          <RotateCcw size={14} className="mr-1.5" /> 再来一遍
        </Button>
      </div>
    )
  }

  const word = queue[idx]

  const rate = async (rating: Rating.Again | Rating.Hard | Rating.Good | Rating.Easy) => {
    await reviewWord(word.id, rating)
    setFlipped(false)
    if (idx + 1 >= queue.length) setDone(true)
    else setIdx((i) => i + 1)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{idx + 1} / {queue.length}</span>
        <Progress value={((idx) / queue.length) * 100} className="w-32 h-1.5" />
      </div>

      <motion.div
        key={word.id}
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        className="cursor-pointer"
        onClick={() => setFlipped((v) => !v)}
      >
        <Card className="min-h-[200px] flex items-center justify-center select-none">
          <CardContent className="text-center py-8">
            <AnimatePresence mode="wait">
              {!flipped ? (
                <motion.div key="front" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <p className="text-3xl font-bold">{word.word}</p>
                  {word.phonetic && (
                    <p className="text-muted-foreground font-mono mt-2">{word.phonetic}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-4">点击翻转查看释义</p>
                </motion.div>
              ) : (
                <motion.div key="back" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                  <p className="text-xl font-semibold">{word.meaning}</p>
                  {word.example && (
                    <p className="text-sm text-muted-foreground italic max-w-xs mx-auto">{word.example}</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>

      {flipped && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-4 gap-2">
          {([
            { rating: Rating.Again as Rating.Again, label: '忘了', color: 'border-red-400 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30' },
            { rating: Rating.Hard as Rating.Hard, label: '困难', color: 'border-orange-400 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/30' },
            { rating: Rating.Good as Rating.Good, label: '还行', color: 'border-blue-400 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30' },
            { rating: Rating.Easy as Rating.Easy, label: '简单', color: 'border-green-400 text-green-500 hover:bg-green-50 dark:hover:bg-green-950/30' },
          ]).map(({ rating, label, color }) => (
            <Button key={rating} variant="outline" className={color} onClick={() => rate(rating)}>
              {label}
            </Button>
          ))}
        </motion.div>
      )}
    </div>
  )
}

// ─── MCQ mode ─────────────────────────────────────────────────────────────────
function MCQQuiz() {
  const { words } = useNotebook()
  const { profile, activeKey, loaded } = useProfile()
  const [loading, setLoading] = useState(false)
  const [questions, setQuestions] = useState<Array<{
    question: string; options: string[]; answer: string; explanation: string
  }>>([])
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)

  const generate = async () => {
    if (words.length < 4) return toast.error('至少需要4个生词才能生成测验')
    if (!loaded) return
    if (!activeKey) return toast.error('请先配置 API Key')

    setLoading(true)
    const sample = words.sort(() => 0.5 - Math.random()).slice(0, 10)
    try {
      const res = await fetch('/api/ai/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          words: sample.map((w) => ({ word: w.word, meaning: w.meaning })),
          mode: 'mcq',
          provider: profile.preferredProvider,
          apiKey: activeKey,
          profile,
        }),
      })
      const data = await res.json()
      setQuestions(data.questions)
      setCurrent(0)
      setSelected(null)
      setScore(0)
      setFinished(false)
    } catch {
      toast.error('生成题目失败')
    } finally {
      setLoading(false)
    }
  }

  if (finished) {
    return (
      <div className="text-center py-10 space-y-3">
        <Trophy size={40} className="mx-auto text-yellow-500" />
        <p className="text-xl font-bold">得分 {score} / {questions.length}</p>
        <p className="text-muted-foreground">{score >= questions.length * 0.8 ? '优秀！' : '继续加油！'}</p>
        <Button onClick={generate}>再来一组</Button>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="text-center py-10 space-y-3">
        <p className="text-muted-foreground">AI 将根据你的生词本随机出题</p>
        <Button onClick={generate} disabled={loading}>
          {loading ? '生成中...' : '开始测验'}
        </Button>
      </div>
    )
  }

  const q = questions[current]

  const choose = (option: string) => {
    if (selected) return
    setSelected(option)
    if (option.startsWith(q.answer)) setScore((s) => s + 1)
  }

  const next = () => {
    if (current + 1 >= questions.length) setFinished(true)
    else { setCurrent((c) => c + 1); setSelected(null) }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>第 {current + 1} / {questions.length} 题</span>
        <span>得分 {score}</span>
      </div>
      <Progress value={((current) / questions.length) * 100} className="h-1.5" />

      <Card>
        <CardContent className="pt-5 pb-4">
          <p className="font-medium mb-4">{q.question}</p>
          <div className="space-y-2">
            {q.options.map((opt) => {
              const isCorrect = opt.startsWith(q.answer)
              const isSelected = selected === opt
              return (
                <button
                  key={opt}
                  onClick={() => choose(opt)}
                  className={`w-full text-left px-4 py-2.5 rounded-lg border text-sm transition-colors ${
                    !selected
                      ? 'hover:bg-muted border-border'
                      : isCorrect
                      ? 'bg-green-50 dark:bg-green-950/30 border-green-400 text-green-700 dark:text-green-300'
                      : isSelected
                      ? 'bg-red-50 dark:bg-red-950/30 border-red-400 text-red-700 dark:text-red-300'
                      : 'border-border opacity-50'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {selected && isCorrect && <CheckCircle2 size={14} className="text-green-500" />}
                    {selected && isSelected && !isCorrect && <XCircle size={14} className="text-red-500" />}
                    {opt}
                  </span>
                </button>
              )
            })}
          </div>
          {selected && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground"
            >
              {q.explanation}
            </motion.div>
          )}
        </CardContent>
      </Card>

      {selected && (
        <Button className="w-full" onClick={next}>
          {current + 1 >= questions.length ? '查看结果' : '下一题'}
        </Button>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function QuizPage() {
  const { words, dueWords } = useNotebook()

  return (
    <AppShell title="测验">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex gap-3 text-sm text-muted-foreground">
          <Badge variant="secondary">生词本 {words.length} 词</Badge>
          {dueWords.length > 0 && (
            <Badge variant="outline" className="text-orange-500 border-orange-300">
              待复习 {dueWords.length} 词
            </Badge>
          )}
        </div>

        <Tabs defaultValue="flashcard">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="flashcard">卡片复习（FSRS）</TabsTrigger>
            <TabsTrigger value="mcq">AI 选择题</TabsTrigger>
          </TabsList>
          <TabsContent value="flashcard" className="mt-4">
            <FlashcardQuiz />
          </TabsContent>
          <TabsContent value="mcq" className="mt-4">
            <MCQQuiz />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  )
}
