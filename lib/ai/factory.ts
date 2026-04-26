import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { AIConfig, AIProvider, DEFAULT_MODELS } from './types'

export function createModel(config: AIConfig) {
  const model = config.model ?? DEFAULT_MODELS[config.provider]

  switch (config.provider) {
    case AIProvider.OpenAI:
      return createOpenAI({ apiKey: config.apiKey }).chat(model)

    case AIProvider.Anthropic:
      return createAnthropic({ apiKey: config.apiKey })(model)

    case AIProvider.Google:
      return createGoogleGenerativeAI({ apiKey: config.apiKey })(model)

    // Third-party providers: use openai-compatible which targets /chat/completions
    // (AI SDK v6's @ai-sdk/openai v3 defaults to /responses which they don't support)
    case AIProvider.DeepSeek:
      return createOpenAICompatible({ name: 'deepseek', apiKey: config.apiKey, baseURL: 'https://api.deepseek.com/v1' })(model)

    case AIProvider.Kimi:
      return createOpenAICompatible({ name: 'kimi', apiKey: config.apiKey, baseURL: 'https://api.moonshot.cn/v1' })(model)

    case AIProvider.MiniMax:
      return createOpenAICompatible({ name: 'minimax', apiKey: config.apiKey, baseURL: 'https://api.minimax.chat/v1' })(model)

    case AIProvider.GLM:
      return createOpenAICompatible({ name: 'glm', apiKey: config.apiKey, baseURL: 'https://open.bigmodel.cn/api/paas/v4' })(model)

    default:
      throw new Error(`Unsupported AI provider: ${config.provider}`)
  }
}
