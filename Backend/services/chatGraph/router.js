export const ROUTE_NAMES = [
  'retrieval',
  'comparison',
  'payment',
  'order_summary',
  'order_update',
  'checkout',
  'policies',
  'general',
]

export function routeIntent(text) {
  const t = String(text || '').trim().toLowerCase()
  if (!t) return 'general'

  if (/compare|versus|\bvs\.?\b|better than|difference between|which one should/i.test(t)) {
    return 'comparison'
  }
  if (/payment|paid|pay(?:ment)?\s+status|did my payment|go through|payment done/i.test(t)) {
    return 'payment'
  }
  if (/cancel|return request|refund request|delete (my )?order|return (my )?order/i.test(t)) {
    return 'order_update'
  }
  if (
    /my orders|order history|recent orders|track(?:ing)? order|order status/i.test(t) &&
    !/cancel|return/i.test(t)
  ) {
    return 'order_summary'
  }
  if (
    /checkout|proceed to pay|shipping address|add to cart|my cart|coupon|discount code|apply coupon|remove coupon|update cart/i.test(
      t
    )
  ) {
    return 'checkout'
  }
  if (/return policy|refund policy|cancellation policy|how does checkout|payment method|shipping policy/i.test(t)) {
    return 'policies'
  }
  if (
    /search|find|show me|looking for|available|browse|category|brand|recommend|product|cricket|bat|ball|jersey/i.test(
      t
    )
  ) {
    return 'retrieval'
  }

  return 'general'
}

export async function routerNode(state) {
  return { route: routeIntent(state.userText) }
}

export function guardRoute(state) {
  return state.guardAllowed ? 'allow' : 'refuse'
}

export function agentRoute(state) {
  const route = state.route || 'general'
  return ROUTE_NAMES.includes(route) ? route : 'general'
}
