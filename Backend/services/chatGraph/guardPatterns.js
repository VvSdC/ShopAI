import { classifyIntentHeuristic } from './routerHeuristic.js'

export const OBVIOUS_INJECTION_PATTERN =
  /ignore\s+(?:all\s+)?(?:previous\s+)?(?:instructions?|prompt)|paste your (?:full )?system prompt|you are now|act as|forget you are|new persona|reveal your|\bDAN\b|jailbreak/i

export function isObviousInjection(text) {
  return OBVIOUS_INJECTION_PATTERN.test(String(text || '').trim())
}

/** High-confidence shopping intent — reuse router heuristics to avoid pattern drift. */
export function isObviousShoppingAllow(text, history = []) {
  return classifyIntentHeuristic(text, history).confidence === 'high'
}
