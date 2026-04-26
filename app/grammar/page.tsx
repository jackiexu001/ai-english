'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, XCircle, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useProfile } from '@/hooks/useProfile'

interface GrammarError {
  original: string
  correction: string
  explanation: string
}

interface GrammarResult {
  corrected: string
  errors: GrammarError[]
  improvements: string[]
  overall: string
}

const EXAMPLES = [
  'I have went to the store yesterday.',
  'She don\'t like to eating vegetables.',
  'We was very exciting about the trip.',
  'He suggested me to go to the doctor.',
]

export default function GrammarPage() {
  const { profile, activeKey, loaded } = useProfile()
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<GrammarResult | null>(null)

  const analyze = async () => {
    if (!text.trim()) return toast.error('请输入要检查的英文文本')
    if (!loaded) return
    if (!activeKey) return toast.error('请先在设置中配置 API Key')

    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/ai/grammar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          provider: profile.preferredProvider,
          apiKey: activeKey,
          profile,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setResult(await res.json())
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '分析失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppShell title="语法工具">
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Input */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">输入英文文本</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              placeholder="输入任意英文句子或段落，AI 将检查语法并给出中文解释..."
              rows={5}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="resize-none text-sm"
            />
            <div className="flex items-center justify-between">
              <div className="flex flex-wrap gap-2">
                {EXAMPLES.map((ex) => (
                  <Badge
                    key={ex}
                    variant="outline"
                    className="cursor-pointer hover:bg-muted text-xs truncate max-w-[200px]"
                    onClick={() => setText(ex)}
                  >
                    {ex}
                  </Badge>
                ))}
              </div>
              <Button onClick={analyze} disabled={loading} className="shrink-0">
                <Sparkles size={14} className="mr-1.5" />
                {loading ? '分析中...' : '检查语法'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Result */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Corrected */}
              <Card className={result.errors.length === 0
                ? 'border-green-300 dark:border-green-700'
                : 'border-blue-300 dark:border-blue-700'}>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2 mb-2">
                    {result.errors.length === 0
                      ? <CheckCircle2 size={16} className="text-green-500" />
                      : <XCircle size={16} className="text-blue-500" />}
                    <span className="text-sm font-medium">
                      {result.errors.length === 0 ? '语法正确！' : '修正后的句子'}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed">{result.corrected}</p>
                </CardContent>
              </Card>

              {/* Errors */}
              {result.errors.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    错误详情
                  </h3>
                  {result.errors.map((err, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                    >
                      <Card>
                        <CardContent className="pt-3 pb-3">
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <Badge variant="destructive" className="text-xs font-mono">
                              {err.original}
                            </Badge>
                            <span className="text-muted-foreground text-xs">→</span>
                            <Badge variant="secondary" className="text-xs font-mono text-green-600 dark:text-green-400">
                              {err.correction}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{err.explanation}</p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Improvements */}
              {result.improvements.length > 0 && (
                <Card className="bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                  <CardContent className="pt-3 pb-3">
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-300 mb-1.5">
                      💡 表达建议
                    </p>
                    <ul className="space-y-1">
                      {result.improvements.map((imp, i) => (
                        <li key={i} className="text-xs text-muted-foreground">• {imp}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Overall */}
              <p className="text-sm text-muted-foreground px-1">{result.overall}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  )
}
