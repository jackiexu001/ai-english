# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server at localhost:3000
npm run build     # Production build
npm run lint      # ESLint check
```

## Architecture

**Next.js 16 App Router** + TypeScript + Tailwind CSS v4 + shadcn/ui.

### AI Layer (`lib/ai/`)

Uses **Vercel AI SDK** (`ai`, `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`).

- `types.ts` — `AIProvider` enum, `ChatMessage`, `AIConfig` interfaces
- `factory.ts` — `createModel(config)` returns a Vercel AI SDK model instance
  - OpenAI-compatible providers (OpenAI, DeepSeek, Kimi/Moonshot, MiniMax, GLM) use `createOpenAI({ baseURL, apiKey })`
  - Anthropic uses `createAnthropic({ apiKey })`
  - Google uses `createGoogleGenerativeAI({ apiKey })`
- All AI calls go through Next.js API routes in `app/api/` — API keys are NEVER exposed to the browser

### Storage Layer (`lib/storage/`)

- `types.ts` — `StorageAdapter` interface (designed for later Supabase swap)
- `local.ts` — `LocalStorageAdapter implements StorageAdapter`
- `index.ts` — exports the active adapter

Word schema includes FSRS fields: `stability`, `difficulty`, `due`, `reps`, `lapses`, `state` for spaced repetition scheduling via `ts-fsrs`.

### Prompts (`lib/prompts/templates.ts`)

All AI prompts are centralized here. Each function takes `UserProfile` and returns a system/user prompt string. Profile fields: `ageGroup ('teens'|'adults')`, `level ('A1'|'A2'|'B1'|'B2'|'C1'|'C2')`, `nativeLanguage ('zh'|...)`.

### User Profile

Stored in localStorage key `user-profile`. Loaded via `useProfile()` hook. All AI calls inject profile into prompts automatically.

### API Key Storage

API keys stored in localStorage key `api-keys` as `Record<AIProvider, string>`. Keys are sent to `/api/ai/*` routes in request body — never in URL params. Server reads key from request body and calls AI provider.

### Hooks (`hooks/`)

- `useProfile()` — read/write UserProfile from localStorage
- `useNotebook()` — CRUD + FSRS scheduling for saved words
- `useAI(feature)` — wraps fetch to `/api/ai/[feature]`, handles loading/error state
- `useSpeech()` — Web Speech API TTS (speak) + STT (record/transcribe)

### Route Structure

```
app/
  page.tsx              # Dashboard with module cards
  learn/page.tsx        # AI content generation by topic/level
  notebook/page.tsx     # Word list + FSRS review queue
  quiz/page.tsx         # 4 modes: Flashcard / Fill-in / MCQ / Review mistakes
  conversation/page.tsx # Streaming AI chat with correction sidebar
  grammar/page.tsx      # Grammar tools: tense, sentence analysis
  settings/page.tsx     # User profile + API key configuration
  api/
    ai/
      chat/route.ts     # POST: conversation
      learn/route.ts    # POST: generate learning content
      grammar/route.ts  # POST: grammar analysis
```

### Component Structure

```
components/
  layout/
    Sidebar.tsx         # Left nav with module links
    Header.tsx          # Top bar with theme toggle + profile badge
  features/
    learn/              # LearnCard, TopicSelector, ContentDisplay
    notebook/           # WordCard, AddWordForm, ReviewQueue
    quiz/               # QuizCard, ModeSelector, ScoreDisplay
    conversation/       # ChatBubble, MessageInput, CorrectionPanel
    grammar/            # GrammarInput, AnalysisResult
```

## Key Libraries

- `ai` (Vercel AI SDK v4) — `streamText`, `generateText`, `useChat`, `useCompletion`
- `ts-fsrs` — spaced repetition: `createEmptyCard()`, `fsrs()`, `Rating`
- `next-themes` — dark/light mode via `ThemeProvider` in root layout
- `framer-motion` — `fadeInUp` variants on page sections
- `sonner` — toast notifications (`toast.success`, `toast.error`)
- `lucide-react` — icons

## Providers Supported

| Provider | SDK | Base URL |
|----------|-----|----------|
| OpenAI | `@ai-sdk/openai` | default |
| Anthropic (Claude) | `@ai-sdk/anthropic` | default |
| Google (Gemini) | `@ai-sdk/google` | default |
| DeepSeek | `createOpenAI` | `https://api.deepseek.com/v1` |
| Kimi (Moonshot) | `createOpenAI` | `https://api.moonshot.cn/v1` |
| MiniMax | `createOpenAI` | `https://api.minimax.chat/v1` |
| GLM (Zhipu) | `createOpenAI` | `https://open.bigmodel.cn/api/paas/v4` |

## Development Phases

- **Phase 1 (current)**: Settings, Learn, Notebook, Quiz, Conversation
- **Phase 2**: Grammar tools, FSRS upgrade, Pronunciation scoring
- **Phase 3**: Supabase migration, auth, multi-device sync
