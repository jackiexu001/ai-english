import { z } from 'zod'

// ─── Learn ────────────────────────────────────────────────────────────────────

export const LearnItemSchema = z.object({
  word: z.string(),
  phonetic: z.string(),
  partOfSpeech: z.string(),
  meaning: z.string(),
  example: z.string(),
  exampleTranslation: z.string(),
  collocations: z.array(z.string()),
  mnemonic: z.string().optional(),
  tips: z.string().optional(),
  wordFamily: z.string().optional(),
  register: z.enum(['formal', 'informal', 'neutral']).optional(),
  commonMistakes: z.string().optional(),
})

export const LearnResultSchema = z.object({
  title: z.string(),
  items: z.array(LearnItemSchema),
  summary: z.string(),
})

export type LearnItem = z.infer<typeof LearnItemSchema>
export type LearnResult = z.infer<typeof LearnResultSchema>

// ─── Reading ──────────────────────────────────────────────────────────────────

export const ReadingHighlightSchema = z.object({
  word: z.string(),
  phonetic: z.string(),
  meaning: z.string(),
  partOfSpeech: z.string(),
  exampleSentence: z.string().optional(),
})

export const ReadingQuestionSchema = z.object({
  question: z.string(),
  options: z.array(z.string()),
  answer: z.string(),
  explanation: z.string(),
})

export const ReadingResultSchema = z.object({
  title: z.string(),
  passage: z.string(),
  highlights: z.array(ReadingHighlightSchema),
  questions: z.array(ReadingQuestionSchema),
  summary: z.string(),
  grammarPoint: z.string().optional(),
})

export type ReadingHighlight = z.infer<typeof ReadingHighlightSchema>
export type ReadingResult = z.infer<typeof ReadingResultSchema>

// ─── Listening: Dictation ─────────────────────────────────────────────────────

export const DictationSentenceSchema = z.object({
  text: z.string(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
})

export const DictationResultSchema = z.object({
  topic: z.string(),
  sentences: z.array(DictationSentenceSchema),
})

export type DictationSentence = z.infer<typeof DictationSentenceSchema>
export type DictationResult = z.infer<typeof DictationResultSchema>

// ─── Listening: Comprehension ─────────────────────────────────────────────────

export const DialogueLineSchema = z.object({
  speaker: z.string(),
  text: z.string(),
})

export const ComprehensionQuestionSchema = z.object({
  question: z.string(),
  options: z.array(z.string()),
  answer: z.string(),
  explanation: z.string(),
})

export const KeyPhraseSchema = z.object({
  phrase: z.string(),
  explanation: z.string(),
})

export const ComprehensionResultSchema = z.object({
  topic: z.string(),
  scene: z.string().optional(),
  dialogue: z.array(DialogueLineSchema),
  questions: z.array(ComprehensionQuestionSchema),
  keyPhrases: z.array(KeyPhraseSchema).optional(),
})

export type DialogueLine = z.infer<typeof DialogueLineSchema>
export type ComprehensionResult = z.infer<typeof ComprehensionResultSchema>
