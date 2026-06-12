import { classifyMessageSafety } from './guardClassifier.js'

export { evaluateGuard, classifyMessageSafety, parseGuardJson } from './guardClassifier.js'

export const REFUSE_MESSAGES = {
  off_topic:
    'I appreciate you reaching out, but I can only assist with ShopAI shopping-related queries — orders, products, coupons, and your account. How can I help you with your shopping today?',
  injection:
    "I'm ShopAI's automated AI shopping assistant. I can't share technical details or internal instructions, but I'm happy to help you find products or check your orders!",
}

export async function guardNode(state) {
  const result = await classifyMessageSafety(state.userText, state.history)
  if (result.allowed) {
    return { guardAllowed: true }
  }
  return {
    guardAllowed: false,
    guardReason: result.reason,
  }
}
