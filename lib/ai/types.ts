export enum AIProvider {
  OpenAI = 'openai',
  Anthropic = 'anthropic',
  Google = 'google',
  DeepSeek = 'deepseek',
  Kimi = 'kimi',
  MiniMax = 'minimax',
  GLM = 'glm',
}

export const AI_PROVIDER_LABELS: Record<AIProvider, string> = {
  [AIProvider.OpenAI]: 'OpenAI (GPT)',
  [AIProvider.Anthropic]: 'Anthropic (Claude)',
  [AIProvider.Google]: 'Google (Gemini)',
  [AIProvider.DeepSeek]: 'DeepSeek',
  [AIProvider.Kimi]: 'Kimi (Moonshot)',
  [AIProvider.MiniMax]: 'MiniMax',
  [AIProvider.GLM]: 'GLM (Zhipu)',
}

export const DEFAULT_MODELS: Record<AIProvider, string> = {
  [AIProvider.OpenAI]: 'gpt-4o-mini',
  [AIProvider.Anthropic]: 'claude-3-5-haiku-20241022',
  [AIProvider.Google]: 'gemini-2.5-flash',
  [AIProvider.DeepSeek]: 'deepseek-chat',
  [AIProvider.Kimi]: 'moonshot-v1-8k',
  [AIProvider.MiniMax]: 'abab6.5s-chat',
  [AIProvider.GLM]: 'glm-4-flash',
}

export interface AIConfig {
  provider: AIProvider
  apiKey: string
  model?: string
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}
