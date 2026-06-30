import { Annotation } from '@langchain/langgraph'

export const ChatGraphState = Annotation.Root({
  userId: Annotation(),
  userName: Annotation(),
  userText: Annotation(),
  history: Annotation({ default: () => [] }),
  guardAllowed: Annotation({ default: () => true }),
  guardReason: Annotation(),
  route: Annotation({ default: () => 'general' }),
  routeReason: Annotation({ default: () => '' }),
  plan: Annotation({ default: () => null }),
  language: Annotation({ default: () => 'en' }),
  languageLabel: Annotation({ default: () => 'English' }),
  languageScript: Annotation({ default: () => 'latin' }),
  replyKind: Annotation({ default: () => null }),
  replyLocked: Annotation({ default: () => false }),
  messages: Annotation({ default: () => [] }),
  toolResults: Annotation({
    default: () => [],
    reducer: (existing, update) => {
      if (!update) return existing
      if (Array.isArray(update)) return [...existing, ...update]
      return [...existing, update]
    },
  }),
  toolsUsed: Annotation({
    default: () => [],
    reducer: (existing, update) => {
      if (!update?.length) return existing
      const seen = new Set(existing)
      for (const name of update) seen.add(name)
      return [...seen]
    },
  }),
  reply: Annotation(),
})
