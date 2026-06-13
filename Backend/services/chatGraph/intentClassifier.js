import { LLM_MAX_TOKENS_CLASSIFIER } from '../../constants/chatLimits.js'
import { chatCompletion } from '../llmService.js'
import logger from '../../utils/logger.js'
import { patchLlmUsageContext } from '../llmUsageContext.js'
import {
  ROUTE_NAMES,
  classifyIntentHeuristic,
  hasKnownProductInHistory,
} from './routerHeuristic.js'
import { extractProductsFromHistory } from './productContext.js'

function formatHistorySnippet(history, limit = 6) {
  return (history || [])
    .slice(-limit)
    .map((m) => `${m.role === 'user' ? 'Customer' : 'Assistant'}: ${String(m.content || '').slice(0, 400)}`)
    .join('\n')
}

function parseClassifierJson(raw) {
  let text = String(raw || '').trim()
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) text = fence[1].trim()
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try {
    const parsed = JSON.parse(text.slice(start, end + 1))
    const route = String(parsed.route || '').trim()
    if (ROUTE_NAMES.includes(route)) {
      return { route, reason: String(parsed.reason || '') }
    }
  } catch {
    return null
  }
  return null
}

async function classifyIntentWithLlm(userText, history = []) {
  const productsDiscussed = hasKnownProductInHistory(history)
  const productNames = extractProductsFromHistory(history)
    .map((p) => p.name)
    .filter(Boolean)
    .slice(-3)

  const system = `You route ShopAI shopping chat messages to exactly one agent.

Routes:
- retrieval — discover/browse/search products, show what's available
- product_detail — more info about a product already discussed (sizes, colors, description)
- checkout — cart, add/buy items, quantity, size/color selection, coupons, shipping address, pay/checkout
- comparison — compare products
- payment — payment status only (did payment succeed, not paying now)
- order_summary — order history / track orders
- order_update — cancel or return an order
- policies — store policies, returns, how checkout works
- general — greetings, identity, broad help

Rules:
- Use conversation meaning, not single keywords.
- If customer wants to buy/add/pay but no product is pinned yet, use retrieval first.
- If a product was already discussed and they give quantity/size/color or ask details, use checkout or product_detail accordingly.
- If they are providing a delivery address or choosing address for checkout, use checkout.
- If products were already listed and the customer wants to add/buy multiple items, use checkout (not retrieval).
- Affirmative replies (yes, ok, proceed) after checkout/address prompts → checkout.

Reply JSON only: {"route":"checkout","reason":"short"}`

  const user = `Products already discussed: ${productsDiscussed ? productNames.join('; ') || 'yes (see history)' : 'none'}

Recent conversation:
${formatHistorySnippet(history)}

Latest customer message:
${userText}`

  patchLlmUsageContext({ span: 'intent-router' })
  const response = await chatCompletion(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    null,
    { maxTokens: LLM_MAX_TOKENS_CLASSIFIER }
  )
  const content = response.choices?.[0]?.message?.content
  return parseClassifierJson(content)
}

export async function classifyIntent(userText, history = []) {
  const heuristic = classifyIntentHeuristic(userText, history)
  if (heuristic.confidence === 'high') {
    return { route: heuristic.route, reason: heuristic.reason }
  }

  try {
    const parsed = await classifyIntentWithLlm(userText, history)
    if (parsed) return parsed
  } catch (err) {
    logger.warn('[intentClassifier] LLM routing failed:', err.message)
  }

  return {
    route: heuristic.route,
    reason: heuristic.reason || 'heuristic_fallback',
  }
}
