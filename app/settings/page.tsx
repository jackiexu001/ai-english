'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Save, Eye, EyeOff, CheckCircle2, Loader2, LogOut, Volume2 } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useProfile } from '@/hooks/useProfile'
import { useTTS } from '@/hooks/useTTS'
import { AIProvider, AI_PROVIDER_LABELS, DEFAULT_MODELS } from '@/lib/ai/types'

const TTS_VOICES = [
  { value: 'alloy',   label: 'Alloy',   desc: '中性' },
  { value: 'echo',    label: 'Echo',    desc: '男声' },
  { value: 'fable',   label: 'Fable',   desc: '英式' },
  { value: 'onyx',    label: 'Onyx',    desc: '浑厚男声' },
  { value: 'nova',    label: 'Nova',    desc: '温柔女声' },
  { value: 'shimmer', label: 'Shimmer', desc: '柔和女声' },
] as const

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const
const LEVEL_LABELS: Record<string, string> = {
  A1: 'A1 · 入门', A2: 'A2 · 基础',
  B1: 'B1 · 中级', B2: 'B2 · 中高级',
  C1: 'C1 · 高级', C2: 'C2 · 精通',
}

export default function SettingsPage() {
  const { profile, apiKeys, availableProviders, loaded, user, updateProfile, updateApiKeys, signOut } = useProfile()
  const { speak, speaking, activeTTSProvider } = useTTS()

  const TTS_PROVIDER_LABELS: Record<string, string> = {
    openai:  'OpenAI TTS（高质量）',
    minimax: 'MiniMax TTS（良好）',
    glm:     'GLM CogSpeech',
    browser: '浏览器内置（基础）',
  }
  const [localKeys, setLocalKeys] = useState<Record<string, string>>({})
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState<string | null>(null) // provider being tested

  // Sync once when localStorage finishes loading
  useEffect(() => {
    if (loaded) setLocalKeys(apiKeys)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded])

  const handleTest = async (provider: string) => {
    const key = localKeys[provider]?.trim()
    if (!key) return toast.error('请先填写 API Key')
    setTesting(provider)
    try {
      const res = await fetch('/api/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey: key }),
      })
      const data = await res.json()
      if (data.ok) {
        toast.success(`${AI_PROVIDER_LABELS[provider as AIProvider] ?? provider} 连接成功 ✓`)
      } else {
        toast.error(`连接失败：${data.error}`)
      }
    } catch {
      toast.error('网络错误，无法连接')
    } finally {
      setTesting(null)
    }
  }

  const handleSave = async () => {
    // Strip empty keys before saving to keep storage clean
    const cleaned = Object.fromEntries(
      Object.entries(localKeys).filter(([, v]) => v.trim())
    )
    setSaving(true)
    await updateApiKeys(cleaned)
    setSaving(false)
    toast.success('保存成功，右上角下拉可切换当前使用的 AI')
  }

  return (
    <AppShell title="设置">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Account */}
        {user && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>账号</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{user.email}</p>
                <p className="text-xs text-muted-foreground mt-0.5">数据已同步至云端</p>
              </div>
              <Button variant="outline" size="sm" onClick={signOut}>
                <LogOut size={14} className="mr-1.5" />
                退出登录
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Learning profile */}
        <Card>
          <CardHeader>
            <CardTitle>学习配置</CardTitle>
            <CardDescription>设置你的英语水平和年龄段，AI 会据此调整内容难度</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>英语水平（CEFR）</Label>
                <Select
                  value={profile.level}
                  onValueChange={(v) => updateProfile({ level: v as typeof profile.level })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LEVELS.map((l) => (
                      <SelectItem key={l} value={l}>{LEVEL_LABELS[l]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>年龄段</Label>
                <Select
                  value={profile.ageGroup}
                  onValueChange={(v) => updateProfile({ ageGroup: v as typeof profile.ageGroup })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="teens">青少年（13-17岁）</SelectItem>
                    <SelectItem value="adults">成人（18+）</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Keys */}
        <Card>
          <CardHeader>
            <CardTitle>API Key 配置</CardTitle>
            <CardDescription>
              填写哪个 API Key，右上角就会出现对应的选项。Key 仅存于本地浏览器，通过服务端代理调用。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loaded && availableProviders.length > 0 && (
              <div className="flex flex-wrap gap-2 pb-2 border-b border-border">
                <span className="text-xs text-muted-foreground self-center">已配置：</span>
                {availableProviders.map((p) => (
                  <span
                    key={p}
                    className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                  >
                    <CheckCircle2 size={11} />
                    {AI_PROVIDER_LABELS[p as AIProvider] ?? p}
                  </span>
                ))}
              </div>
            )}

            {Object.values(AIProvider).map((provider) => (
              <div key={provider} className="space-y-1.5">
                <Label className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    {AI_PROVIDER_LABELS[provider]}
                    {availableProviders.includes(provider) && (
                      <CheckCircle2 size={13} className="text-green-500" />
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground font-normal">
                    {DEFAULT_MODELS[provider]}
                  </span>
                </Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showKeys[provider] ? 'text' : 'password'}
                      placeholder={`输入 ${AI_PROVIDER_LABELS[provider]} API Key`}
                      value={localKeys[provider] ?? ''}
                      onChange={(e) =>
                        setLocalKeys((prev) => ({ ...prev, [provider]: e.target.value }))
                      }
                      className="pr-10 font-mono text-sm"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowKeys((prev) => ({ ...prev, [provider]: !prev[provider] }))
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showKeys[provider] ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 text-xs"
                    disabled={!localKeys[provider]?.trim() || testing === provider}
                    onClick={() => handleTest(provider)}
                  >
                    {testing === provider
                      ? <Loader2 size={13} className="animate-spin" />
                      : '测试'}
                  </Button>
                </div>
              </div>
            ))}

            <Button onClick={handleSave} disabled={saving} className="w-full mt-2">
              <Save size={15} className="mr-2" />
              {saving ? '保存中...' : '保存 API Keys'}
            </Button>
          </CardContent>
        </Card>

        {/* TTS Voice Settings */}
        {loaded && (
          <Card>
            <CardHeader>
              <CardTitle>朗读声音设置</CardTitle>
              <CardDescription>
                当前使用：<span className="font-medium text-foreground">{TTS_PROVIDER_LABELS[activeTTSProvider]}</span>
                {activeTTSProvider === 'browser' && (
                  <span className="ml-1 text-amber-500">（配置 OpenAI / MiniMax / GLM key 可升级为 AI 语音）</span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>声音</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {TTS_VOICES.map((v) => (
                    <button
                      key={v.value}
                      type="button"
                      onClick={() => updateProfile({ ttsVoice: v.value })}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-colors ${
                        (profile.ttsVoice ?? 'nova') === v.value
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border hover:bg-muted'
                      }`}
                    >
                      <span className="font-medium">{v.label}</span>
                      <span className="text-xs text-muted-foreground">{v.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center justify-between">
                  <span>语速</span>
                  <span className="text-muted-foreground font-normal text-xs">
                    {(profile.ttsSpeed ?? 1.0).toFixed(1)}x
                  </span>
                </Label>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={profile.ttsSpeed ?? 1.0}
                  onChange={(e) => updateProfile({ ttsSpeed: parseFloat(e.target.value) })}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0.5x 慢速</span>
                  <span>1.0x 正常</span>
                  <span>2.0x 快速</span>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                disabled={speaking}
                onClick={() => speak('The quick brown fox jumps over the lazy dog.')}
                className="w-full"
              >
                <Volume2 size={14} className="mr-2" />
                {speaking ? '播放中...' : '试听当前声音'}
              </Button>
            </CardContent>
          </Card>
        )}

      </div>
    </AppShell>
  )
}
