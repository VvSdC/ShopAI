import { patchLlmUsageContext } from '../llmUsageContext.js'
import { emitChatStreamEvent, isChatStreamActive } from '../chatStreamContext.js'
import { isObviousInjection } from './guardPatterns.js'
import { classifyIntentHeuristic } from './routerHeuristic.js'
import { planUserMessage } from '../chatPlanner.js'

export { evaluateGuard, classifyMessageSafety, parseGuardJson } from './guardClassifier.js'
export { parseFusedJson, classifyMessageFused } from './fusedClassifier.js'
export { isObviousInjection, isObviousShoppingAllow } from './guardPatterns.js'

/**
 * Heuristic English-language signal — common English function words / shopping
 * verbs that almost never appear in transliterated Indic prose.
 */
const ENGLISH_MARKER_PATTERN =
  /\b(show|find|search|browse|tell|give|need|want|add|buy|order|orders|my|the|in|with|of|to|i|me|please|hi|hello|hey|thanks|thank|ok|okay|sure|proceed|confirm|yes|yeah|yep|no|cart|checkout|pay|payment|cancel|return|refund|status|tracking|coupon|address|shipping|product|item|details|sizes?|colors?|stock|price|first|second|third|fourth)\b/i

export const REFUSE_MESSAGES = {
  off_topic:
    'I appreciate you reaching out, but I can only assist with ShopAI shopping-related queries — orders, products, coupons, and your account. How can I help you with your shopping today?',
  injection:
    "I'm ShopAI's automated AI shopping assistant. I can't share technical details or internal instructions, but I'm happy to help you find products or check your orders!",
}

/**
 * Single-pass safety + routing + language + slot extraction.
 * The planner is the source of truth for everything downstream.
 */
export async function guardNode(state) {
  const text = String(state.userText || '').trim()

  if (!text) {
    return {
      guardAllowed: true,
      route: 'general',
      routeReason: 'empty',
      plan: null,
      language: 'en',
      languageLabel: 'English',
      languageScript: 'latin',
    }
  }

  if (isObviousInjection(text)) {
    return {
      guardAllowed: false,
      guardReason: 'injection',
      route: 'general',
      routeReason: 'injection_block',
      plan: null,
      language: 'en',
      languageLabel: 'English',
      languageScript: 'latin',
    }
  }

  // Fast path: high-confidence heuristic match on an English-looking message.
  // We require at least one common English function/verb so transliterated
  // Indic messages (e.g. "naaku oka cricket ball kavali") fall through to the
  // planner for proper language detection and slot extraction.
  const heuristic = classifyIntentHeuristic(state.userText, state.history)
  const looksEnglish =
    // eslint-disable-next-line no-control-regex -- ASCII-only check for English heuristic fast path
    /^[\x00-\x7F]+$/.test(text) && ENGLISH_MARKER_PATTERN.test(text)

  // Routes where language nuance / slot extraction rarely matters. Skipping
  // the planner LLM here saves ~1 LLM RTT (300–800ms) on the most common
  // shopping intents.
  const FAST_PATH_ROUTES = new Set([
    'general',
    'order_summary',
    'order_update',
    'payment',
    'policies',
    'comparison',
  ])

  const fastPathEligible =
    heuristic.confidence === 'high' &&
    (looksEnglish || FAST_PATH_ROUTES.has(heuristic.route))

  if (fastPathEligible) {
    patchLlmUsageContext({ route: heuristic.route, routeReason: heuristic.reason })
    return {
      guardAllowed: true,
      route: heuristic.route,
      routeReason: heuristic.reason,
      plan: null,
      language: 'en',
      languageLabel: 'English',
      languageScript: 'latin',
    }
  }

  if (isChatStreamActive()) {
    emitChatStreamEvent({
      type: 'tool_start',
      toolName: 'planner',
      label: 'Understanding your request…',
    })
  }
  const plan = await planUserMessage(state.userText, state.history)

  if (!plan.allowed) {
    return {
      guardAllowed: false,
      guardReason: plan.block_reason || 'off_topic',
      route: 'general',
      routeReason: plan.reason || 'planner_block',
      plan,
      language: plan.language || 'en',
      languageLabel: plan.language_label || 'English',
      languageScript: plan.script || 'latin',
    }
  }

  patchLlmUsageContext({ route: plan.route, routeReason: plan.reason })
  return {
    guardAllowed: true,
    route: plan.route,
    routeReason: plan.reason || 'planner',
    plan,
    language: plan.language || 'en',
    languageLabel: plan.language_label || 'English',
    languageScript: plan.script || 'latin',
  }
}
