'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Volume2, RotateCcw, Mic, MicOff } from 'lucide-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useProfile } from '@/hooks/useProfile'
import { useSpeech } from '@/hooks/useSpeech'
import { cn } from '@/lib/utils'
import type { ChatMessage } from '@/lib/ai/types'

const SCENARIO_STARTERS = [
  { label: '☕ 咖啡店点单', prompt: "Let's practice ordering coffee. I'll be the barista." },
  { label: '✈️ 机场问路', prompt: "I'm at the airport and need help finding my gate. You be the staff." },
  { label: '💼 面试练习', prompt: "Let's do a mock job interview for a software engineer position." },
  { label: '🏨 酒店入住', prompt: "I'm checking into a hotel. You be the front desk receptionist." },
  { label: '🗺️ 问路对话', prompt: "I'm lost in the city. Can you help me find the nearest subway station?" },
]

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export default function ConversationPage() {
  const { profile, activeKey, loaded } = useProfile()
  const { speak, speaking, listen, listening } = useSpeech()
  const bottomRef = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [scenario, setScenario] = useState('')

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(async (userText: string) => {
    if (!userText.trim() || !activeKey) return

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: userText }
    const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: '' }

    setMessages((prev) => [...prev, userMsg, aiMsg])
    setInput('')
    setIsLoading(true)

    try {
      const history: ChatMessage[] = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }))
      history.push({ role: 'user', content: userText })

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          provider: profile.preferredProvider,
          apiKey: activeKey,
          profile,
        }),
      })

      if (!res.ok || !res.body) throw new Error('Stream failed')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        setMessages((prev) =>
          prev.map((m) => (m.id === aiMsg.id ? { ...m, content: accumulated } : m))
        )
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '发送失败，请重试')
      setMessages((prev) => prev.filter((m) => m.id !== aiMsg.id))
    } finally {
      setIsLoading(false)
    }
  }, [messages, profile, activeKey])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const startScenario = (prompt: string, label: string) => {
    setScenario(label)
    setMessages([])
    sendMessage(prompt)
  }

  const handleVoiceInput = async () => {
    if (!activeKey) return toast.error('请先配置 API Key')
    try {
      const transcript = await listen()
      setInput(transcript)
    } catch {
      toast.error('语音识别失败，请检查麦克风权限')
    }
  }

  const reset = () => {
    setMessages([])
    setScenario('')
    setInput('')
  }

  if (loaded && !activeKey) {
    return (
      <AppShell title="对话练习">
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          请先在设置中配置 API Key
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="对话练习">
      <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-8rem)] gap-3">
        {messages.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <p className="text-sm text-muted-foreground">选择一个场景快速开始，或直接输入：</p>
            <div className="flex flex-wrap gap-2">
              {SCENARIO_STARTERS.map((s) => (
                <Badge
                  key={s.label}
                  variant="outline"
                  className="cursor-pointer hover:bg-muted transition-colors text-sm py-1.5 px-3"
                  onClick={() => startScenario(s.prompt, s.label)}
                >
                  {s.label}
                </Badge>
              ))}
            </div>
          </motion.div>
        )}

        {messages.length > 0 && (
          <div className="flex items-center justify-between">
            {scenario && <Badge variant="secondary">{scenario}</Badge>}
            <Button variant="ghost" size="sm" onClick={reset} className="ml-auto">
              <RotateCcw size={13} className="mr-1.5" />
              重新开始
            </Button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-muted rounded-bl-sm'
                  )}
                >
                  {msg.role === 'assistant' ? (
                    <div className="space-y-2">
                      {msg.content.split('---').map((part, i) => (
                        <div key={i}>
                          {i === 0 ? (
                            <div className="flex items-start justify-between gap-2">
                              <p className="whitespace-pre-wrap leading-relaxed">{part.trim()}</p>
                              {part.trim() && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 shrink-0 mt-0.5"
                                  onClick={() => speak(part.trim())}
                                  disabled={speaking}
                                >
                                  <Volume2 size={12} />
                                </Button>
                              )}
                            </div>
                          ) : (
                            <div className="mt-2 pt-2 border-t border-border/40 text-xs text-muted-foreground whitespace-pre-wrap">
                              {part.trim()}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isLoading && messages[messages.length - 1]?.content === '' && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
                <motion.div
                  className="flex gap-1"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                >
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-muted-foreground inline-block"
                    />
                  ))}
                </motion.div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <Card className="shrink-0">
          <CardContent className="pt-3 pb-3">
            <form onSubmit={handleSubmit} className="flex items-end gap-2">
              <Textarea
                placeholder="用英语说点什么..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit(e as unknown as React.FormEvent)
                  }
                }}
                className="min-h-[60px] max-h-[120px] resize-none text-sm"
                rows={2}
              />
              <div className="flex flex-col gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleVoiceInput}
                  disabled={listening}
                  className={cn(listening && 'border-red-400 text-red-500')}
                >
                  {listening ? <MicOff size={15} /> : <Mic size={15} />}
                </Button>
                <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                  <Send size={15} />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
