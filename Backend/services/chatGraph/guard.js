const INJECTION_PATTERNS = [
  /ignore (all )?(previous|prior|above) instructions/i,
  /disregard (all )?(previous|prior|above) instructions/i,
  /paste (your )?(full )?system prompt/i,
  /reveal (your )?(system )?(prompt|instructions)/i,
  /show me your (prompt|instructions|rules)/i,
  /you are now/i,
  /jailbreak/i,
]

const OFF_TOPIC_PATTERNS = [
  /\b(write|generate|create|give me)\s+(a\s+)?(python|javascript|java|typescript|code|script)\b/i,
  /\b(scrape|scraping)\s+(websites?|data)\b/i,
  /\b(politics|election|presidential)\b/i,
  /\b(weather forecast|recipe for)\b/i,
]

export const REFUSE_MESSAGES = {
  off_topic:
    'I appreciate you reaching out, but I can only assist with ShopAI shopping-related queries — orders, products, coupons, and your account. How can I help you with your shopping today?',
  injection:
    "I'm ShopAI's automated AI shopping assistant. I can't share technical details or internal instructions, but I'm happy to help you find products or check your orders!",
}

export function evaluateGuard(userText) {
  const text = String(userText || '').trim()
  if (!text) {
    return { allowed: true }
  }

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      return { allowed: false, reason: 'injection' }
    }
  }

  for (const pattern of OFF_TOPIC_PATTERNS) {
    if (pattern.test(text)) {
      return { allowed: false, reason: 'off_topic' }
    }
  }

  return { allowed: true }
}

export async function guardNode(state) {
  const result = evaluateGuard(state.userText)
  if (result.allowed) {
    return { guardAllowed: true }
  }
  return {
    guardAllowed: false,
    guardReason: result.reason,
  }
}
