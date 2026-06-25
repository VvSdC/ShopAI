import { patchLlmUsageContext } from '../llmUsageContext.js'
import { isObviousInjection } from './guardPatterns.js'
import { classifyIntentHeuristic } from './routerHeuristic.js'
import { classifyMessageFused } from './fusedClassifier.js'

export { evaluateGuard, classifyMessageSafety, parseGuardJson } from './guardClassifier.js'
export { parseFusedJson, classifyMessageFused } from './fusedClassifier.js'
export { isObviousInjection, isObviousShoppingAllow } from './guardPatterns.js'

export const REFUSE_MESSAGES = {
  off_topic:
    'I appreciate you reaching out, but I can only assist with ShopAI shopping-related queries — orders, products, coupons, and your account. How can I help you with your shopping today?',
  injection:
    "I'm ShopAI's automated AI shopping assistant. I can't share technical details or internal instructions, but I'm happy to help you find products or check your orders!",
}

export async function guardNode(state) {
  const text = String(state.userText || '').trim()

  if (!text) {
    return { guardAllowed: true, route: 'general', routeReason: 'empty' }
  }

  if (isObviousInjection(text)) {
    return {
      guardAllowed: false,
      guardReason: 'injection',
      route: 'general',
      routeReason: 'injection_block',
    }
  }

  const heuristic = classifyIntentHeuristic(state.userText, state.history)
  if (heuristic.confidence === 'high') {
    patchLlmUsageContext({ route: heuristic.route, routeReason: heuristic.reason })
    return {
      guardAllowed: true,
      route: heuristic.route,
      routeReason: heuristic.reason,
    }
  }

  const result = await classifyMessageFused(state.userText, state.history, heuristic)
  if (!result.allowed) {
    return {
      guardAllowed: false,
      guardReason: result.reason,
      route: 'general',
      routeReason: result.reason,
    }
  }

  patchLlmUsageContext({ route: result.route, routeReason: result.reason })
  return {
    guardAllowed: true,
    route: result.route,
    routeReason: result.reason,
  }
}
