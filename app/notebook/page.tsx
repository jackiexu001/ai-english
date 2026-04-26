'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Volume2, Search, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { State } from 'ts-fsrs'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useNotebook } from '@/hooks/useNotebook'
import { useSpeech } from '@/hooks/useSpeech'
import { Word } from '@/lib/storage/types'

function stateLabel(state: State): { label: string; color: string } {
  const map: Record<State, { label: string; color: string }> = {
    [State.New]: { label: '新词', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
    [State.Learning]: { label: '学习中', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
    [State.Review]: { label: '复习中', color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
    [State.Relearning]: { label: '重学', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' },
  }
  return map[state] ?? { label: '未知', color: '' }
}

function WordCard({ word, onDelete, onSpeak }: {
  word: Word
  onDelete: (id: string) => void
  onSpeak: (text: string) => void
}) {
  const s = stateLabel(word.state)
  const dueDate = new Date(word.due)
  const isOverdue = dueDate <= new Date()

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      <Card>
        <CardContent className="pt-3 pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold">{word.word}</span>
                {word.phonetic && (
                  <span className="text-xs text-muted-foreground font-mono">{word.phonetic}</span>
                )}
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${s.color}`}>
                  {s.label}
                </span>
                {isOverdue && word.state !== State.New && (
                  <span className="text-xs text-orange-500 flex items-center gap-0.5">
                    <Clock size={11} /> 待复习
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{word.meaning}</p>
              {word.example && (
                <p className="text-xs text-muted-foreground mt-1 italic">{word.example}</p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onSpeak(word.word)}>
                <Volume2 size={13} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => onDelete(word.id)}
              >
                <Trash2 size={13} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default function NotebookPage() {
  const { words, dueWords, loading, addWord, removeWord } = useNotebook()
  const { speak } = useSpeech()
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ word: '', meaning: '', phonetic: '', example: '' })
  const [adding, setAdding] = useState(false)

  const filtered = words.filter(
    (w) =>
      w.word.toLowerCase().includes(search.toLowerCase()) ||
      w.meaning.includes(search)
  )

  const handleAdd = async () => {
    if (!form.word.trim() || !form.meaning.trim()) {
      return toast.error('单词和释义不能为空')
    }
    setAdding(true)
    await addWord(form)
    setForm({ word: '', meaning: '', phonetic: '', example: '' })
    setShowAdd(false)
    setAdding(false)
    toast.success(`"${form.word}" 已添加到生词本`)
  }

  const handleDelete = async (id: string) => {
    await removeWord(id)
    toast.success('已删除')
  }

  return (
    <AppShell title="生词本">
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Stats + actions */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-3 text-sm text-muted-foreground">
            <span>共 <strong className="text-foreground">{words.length}</strong> 词</span>
            {dueWords.length > 0 && (
              <span className="text-orange-500">
                <strong>{dueWords.length}</strong> 词待复习
              </span>
            )}
          </div>
          <Button size="sm" onClick={() => setShowAdd((v) => !v)}>
            <Plus size={14} className="mr-1" />
            手动添加
          </Button>
        </div>

        {/* Add form */}
        <AnimatePresence>
          {showAdd && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Card>
                <CardContent className="pt-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>单词 *</Label>
                      <Input
                        placeholder="e.g. serendipity"
                        value={form.word}
                        onChange={(e) => setForm((p) => ({ ...p, word: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>音标</Label>
                      <Input
                        placeholder="e.g. /ˌserənˈdɪpɪti/"
                        value={form.phonetic}
                        onChange={(e) => setForm((p) => ({ ...p, phonetic: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>中文释义 *</Label>
                    <Input
                      placeholder="偶然发现美好事物的能力"
                      value={form.meaning}
                      onChange={(e) => setForm((p) => ({ ...p, meaning: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>例句（可选）</Label>
                    <Input
                      placeholder="Some of the best discoveries in science were made by serendipity."
                      value={form.example}
                      onChange={(e) => setForm((p) => ({ ...p, example: e.target.value }))}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => setShowAdd(false)}>取消</Button>
                    <Button size="sm" onClick={handleAdd} disabled={adding}>
                      {adding ? '添加中...' : '添加到生词本'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="搜索单词或释义..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">全部（{filtered.length}）</TabsTrigger>
            <TabsTrigger value="due">待复习（{dueWords.length}）</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-3 space-y-2">
            {loading ? (
              <p className="text-center text-muted-foreground py-8">加载中...</p>
            ) : filtered.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {search ? '没有找到匹配的单词' : '生词本还是空的，去 AI 学习页面添加吧'}
              </p>
            ) : (
              <AnimatePresence>
                {filtered.map((word) => (
                  <WordCard
                    key={word.id}
                    word={word}
                    onDelete={handleDelete}
                    onSpeak={speak}
                  />
                ))}
              </AnimatePresence>
            )}
          </TabsContent>

          <TabsContent value="due" className="mt-3 space-y-2">
            {dueWords.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">🎉 今日没有待复习的单词</p>
            ) : (
              <AnimatePresence>
                {dueWords.map((word) => (
                  <WordCard key={word.id} word={word} onDelete={handleDelete} onSpeak={speak} />
                ))}
              </AnimatePresence>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  )
}
