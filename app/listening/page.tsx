'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Headphones, Sparkles, Volume2, Play, CheckCircle2, XCircle,
  RotateCcw, ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useProfile } from '@/hooks/useProfile'
import { useSpeech } from '@/hooks/useSpeech'
import { useStreamObject } from '@/hooks/useStreamObject'
import type { DictationResult, DictationSentence, ComprehensionResult } from '@/lib/ai/schemas'

const QUICK_TOPICS = [
  '机场旅行', '餐厅点餐', '天气聊天', '购物讨价',
  '工作面试', '医院就诊', '朋友聚会', '新闻事件',
]

/* ─────────────────────── Dictation Mode ────────────────────────────── */

function DictationMode({ data, speak, speaking }: {
  data: DictationResult
  speak: (text: string) => void
  speaking: boolean
}) {
  const sentences = data.sentences ?? []
  const [currentIdx, setCurrentIdx] = useState(0)
  const [inputs, setInputs] = useState<string[]>(Array(sentences.length).fill(''))
  const [revealed, setRevealed] = useState<boolean[]>(Array(sentences.length).fill(false))
  const inputRef = useRef<HTMLInputElement>(null)

  const current: DictationSentence | undefined = sentences[currentIdx]
  const allDone = currentIdx >= sentences.length

  const normalize = (t: string) => t.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()

  const revealAndNext = () => {
    setRevealed((prev) => { const n = [...prev]; n[currentIdx] = true; return n })
  }

  const goNext = () => {
    if (currentIdx < sentences.length - 1) {
      setCurrentIdx((i) => i + 1)
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setCurrentIdx(sentences.length)
    }
  }

  const reset = () => {
    setCurrentIdx(0)
    setInputs(Array(sentences.length).fill(''))
    setRevealed(Array(sentences.length).fill(false))
  }

  const score = sentences.filter((s, i) => normalize(inputs[i]) === normalize(s.text)).length

  const difficultyLabel: Record<string, string> = { easy: '简单', medium: '中等', hard: '困难' }
  const difficultyColor: Record<string, string> = {
    easy: 'border-green-300 text-green-600 dark:text-green-400',
    medium: 'border-yellow-300 text-yellow-600 dark:text-yellow-400',
    hard: 'border-red-300 text-red-600 dark:text-red-400',
  }

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>句子 {Math.min(currentIdx + 1, sentences.length)} / {sentences.length}</span>
        <div className="flex gap-1">
          {sentences.map((_, i) => (
            <div key={i} className={`h-1.5 w-6 rounded-full transition-colors ${
              i < currentIdx ? 'bg-green-500' : i === currentIdx ? 'bg-primary' : 'bg-muted'
            }`} />
          ))}
        </div>
      </div>

      {!allDone && current ? (
        <Card>
          <CardContent className="pt-5 pb-4 space-y-4">
            {/* Difficulty badge */}
            <div className="flex justify-center">
              <Badge variant="outline" className={`text-xs ${difficultyColor[current.difficulty]}`}>
                {difficultyLabel[current.difficulty]}
              </Badge>
            </div>

            {/* Play button */}
            <div className="flex justify-center">
              <Button size="lg" variant="outline" className="rounded-full w-16 h-16" disabled={speaking} onClick={() => speak(current.text)}>
                {speaking ? <Sparkles size={20} className="animate-pulse" /> : <Play size={20} />}
              </Button>
            </div>
            <p className="text-center text-xs text-muted-foreground">点击播放后，输入你听到的英文</p>

            {/* Input */}
            <Input
              ref={inputRef}
              placeholder="在此输入你听到的句子..."
              value={inputs[currentIdx]}
              onChange={(e) => setInputs((prev) => { const n = [...prev]; n[currentIdx] = e.target.value; return n })}
              onKeyDown={(e) => e.key === 'Enter' && !revealed[currentIdx] && revealAndNext()}
              className="text-center"
              autoFocus
            />

            {/* Reveal / Next */}
            {!revealed[currentIdx] ? (
              <Button onClick={revealAndNext} className="w-full" variant="outline">查看答案</Button>
            ) : (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-muted/50 text-sm text-center">
                  <p className="font-medium text-foreground">{current.text}</p>
                  {(() => {
                    const correct = normalize(inputs[currentIdx]) === normalize(current.text)
                    return (
                      <div className={`mt-1 text-xs font-medium flex items-center justify-center gap-1 ${
                        correct ? 'text-green-600 dark:text-green-400' : 'text-red-500'
                      }`}>
                        {correct ? <><CheckCircle2 size={12} /> 完全正确！</> : <><XCircle size={12} /> 有出入，请仔细对照</>}
                      </div>
                    )
                  })()}
                </div>
                <Button onClick={goNext} className="w-full">
                  <ChevronRight size={15} className="mr-1" />
                  {currentIdx < sentences.length - 1 ? '下一句' : '查看结果'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : allDone ? (
        // Results
        <Card>
          <CardContent className="pt-5 pb-4 space-y-4">
            <div className="text-center">
              <p className="text-3xl font-bold">{score} / {sentences.length}</p>
              <p className="text-muted-foreground text-sm mt-1">
                {score === sentences.length ? '🎉 满分！听力相当不错！'
                  : score >= Math.ceil(sentences.length / 2) ? '👍 过半正确，继续练习！'
                  : '💪 多听几遍，加油！'}
              </p>
            </div>
            <div className="space-y-2">
              {sentences.map((s, i) => {
                const correct = normalize(inputs[i]) === normalize(s.text)
                return (
                  <div key={i} className={`p-2.5 rounded-lg text-sm border ${
                    correct ? 'border-green-200 bg-green-50 dark:bg-green-950/20' : 'border-red-200 bg-red-50 dark:bg-red-950/20'
                  }`}>
                    <div className="flex items-center gap-1.5 justify-between">
                      <div className="flex items-center gap-1.5">
                        {correct ? <CheckCircle2 size={12} className="text-green-500 shrink-0" /> : <XCircle size={12} className="text-red-500 shrink-0" />}
                        <span className="font-medium">{s.text}</span>
                      </div>
                      <Badge variant="outline" className={`text-[10px] shrink-0 ${difficultyColor[s.difficulty]}`}>
                        {difficultyLabel[s.difficulty]}
                      </Badge>
                    </div>
                    {!correct && inputs[i] && (
                      <p className="text-xs text-muted-foreground mt-0.5 pl-4">你的答案：{inputs[i]}</p>
                    )}
                  </div>
                )
              })}
            </div>
            <Button onClick={reset} variant="outline" className="w-full">
              <RotateCcw size={14} className="mr-1.5" />
              重新练习
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

/* ─────────────────── Comprehension Mode ────────────────────────────── */

function ComprehensionMode({ data, speak, speaking }: {
  data: ComprehensionResult
  speak: (text: string) => void
  speaking: boolean
}) {
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [submitted, setSubmitted] = useState(false)

  const dialogue = data.dialogue ?? []
  const questions = data.questions ?? []
  const keyPhrases = data.keyPhrases ?? []

  const fullDialogueText = dialogue.map((l) => `${l.speaker}: ${l.text}`).join('. ')

  const score = (() => {
    if (!submitted) return null
    return questions.filter((q, i) => answers[i] === q.answer).length
  })()

  return (
    <div className="space-y-4">
      {/* Dialogue */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">对话内容</CardTitle>
            <Button variant="ghost" size="sm" disabled={speaking} onClick={() => speak(fullDialogueText)}>
              <Volume2 size={13} className="mr-1" />
              朗读全文
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {/* Scene description */}
          {data.scene && (
            <p className="text-xs text-muted-foreground bg-muted/50 rounded px-2.5 py-1.5">
              📍 {data.scene}
            </p>
          )}
          <div className="space-y-2.5 mt-2">
            {dialogue.map((line, i) => (
              <div key={i} className={`flex gap-2.5 ${line.speaker === 'B' ? 'flex-row-reverse' : ''}`}>
                <div className="shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                  {line.speaker}
                </div>
                <div className="flex-1 max-w-[80%] group">
                  <div className={`px-3 py-2 rounded-xl text-sm inline-flex items-start gap-1.5 ${
                    line.speaker === 'A' ? 'bg-muted rounded-tl-none' : 'bg-primary/10 rounded-tr-none'
                  }`}>
                    <span>{line.text}</span>
                    <button
                      type="button"
                      onClick={() => speak(line.text)}
                      disabled={speaking}
                      className="shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                    >
                      <Volume2 size={11} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Questions */}
      {questions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">理解题</CardTitle>
              {submitted && score !== null && (
                <Badge variant={score >= Math.ceil(questions.length / 2) ? 'default' : 'destructive'}>
                  {score} / {questions.length} 正确
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {questions.map((q, qi) => (
              <div key={qi} className="space-y-2">
                <p className="text-sm font-medium">{qi + 1}. {q.question}</p>
                <div className="space-y-1.5">
                  {(q.options ?? []).map((opt, oi) => {
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
                        className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                          isCorrect ? 'border-green-500 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300'
                          : isWrong ? 'border-red-400 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300'
                          : isSelected ? 'border-primary bg-primary/5'
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
                {submitted && <p className="text-xs text-muted-foreground pl-1">{q.explanation}</p>}
              </div>
            ))}

            {!submitted ? (
              <Button onClick={() => setSubmitted(true)} disabled={Object.keys(answers).length < questions.length} className="w-full">
                提交答案
              </Button>
            ) : (
              <div className="text-center text-sm text-muted-foreground py-1">
                {score === questions.length ? '🎉 全对！听力理解非常棒！'
                  : score! >= Math.ceil(questions.length / 2) ? '👍 不错！再练习几遍会更好'
                  : '💪 多听几遍对话，加油！'}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Key phrases */}
      {keyPhrases.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">重点短语</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {keyPhrases.map((kp, i) => (
              <div key={i} className="p-2.5 rounded-lg bg-muted/40 border space-y-0.5">
                <p className="text-sm font-medium italic">"{kp.phrase}"</p>
                <p className="text-xs text-muted-foreground">{kp.explanation}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

/* ─────────────────────────── Main Page ─────────────────────────────── */

export default function ListeningPage() {
  const { profile, activeKey, loaded } = useProfile()
  const { speak, speaking } = useSpeech()

  const [topic, setTopic] = useState('')
  const [activeTab, setActiveTab] = useState<'dictation' | 'comprehension'>('dictation')

  const {
    submit: submitDictation,
    object: dictationData,
    isLoading: dictationLoading,
  } = useStreamObject<DictationResult>({
    api: '/api/ai/listening',
    onError: (e) => toast.error(e.message),
  })

  const {
    submit: submitComprehension,
    object: comprehensionData,
    isLoading: comprehensionLoading,
  } = useStreamObject<ComprehensionResult>({
    api: '/api/ai/listening',
    onError: (e) => toast.error(e.message),
  })

  const loading = activeTab === 'dictation' ? dictationLoading : comprehensionLoading

  const generate = (t?: string) => {
    const finalTopic = t ?? topic
    if (!finalTopic.trim()) return toast.error('请输入练习主题')
    if (!loaded) return
    if (!activeKey) return toast.error('请先在设置中配置 API Key')

    const body = {
      topic: finalTopic,
      mode: activeTab,
      provider: profile.preferredProvider,
      apiKey: activeKey,
      profile,
    }

    if (activeTab === 'dictation') submitDictation(body)
    else submitComprehension(body)
  }

  return (
    <AppShell title="听力训练">
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Mode tabs */}
        <div className="flex gap-2 p-1 bg-muted rounded-xl">
          {([
            { value: 'dictation',     label: '🎧 听写练习', desc: '听句子逐句输入' },
            { value: 'comprehension', label: '💬 对话理解', desc: '听对话答题' },
          ] as const).map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.value
                  ? 'bg-background shadow text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div>{tab.label}</div>
              <div className="text-xs opacity-70">{tab.desc}</div>
            </button>
          ))}
        </div>

        {/* Topic input */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Headphones size={16} />
              {activeTab === 'dictation' ? '听写练习主题' : '听力对话主题'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="输入主题，例如：机场旅行、餐厅点餐..."
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

        {/* Loading — hides as soon as first data arrives */}
        {loading && !dictationData?.sentences?.length && !comprehensionData?.dialogue?.length && (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="mr-3">
              <Sparkles size={20} />
            </motion.div>
            AI 正在生成听力内容...
          </div>
        )}

        {/* Dictation content — appears as sentences stream in */}
        <AnimatePresence mode="wait">
          {activeTab === 'dictation' && (dictationData?.sentences?.length ?? 0) > 0 && (
            <motion.div key="dictation" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <DictationMode data={dictationData as DictationResult} speak={speak} speaking={speaking} />
            </motion.div>
          )}

          {activeTab === 'comprehension' && (comprehensionData?.dialogue?.length ?? 0) > 0 && (
            <motion.div key="comprehension" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <ComprehensionMode data={comprehensionData as ComprehensionResult} speak={speak} speaking={speaking} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  )
}
