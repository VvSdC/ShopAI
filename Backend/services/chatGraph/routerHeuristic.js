import {
  activeCatalogProducts,
  isAddToCartVariantIntent,
} from './productContext.js'

export const ROUTE_NAMES = [
  'retrieval',
  'product_detail',
  'comparison',
  'payment',
  'order_summary',
  'order_update',
  'checkout',
  'policies',
  'general',
]

const PAYMENT_STATUS_PATTERN =
  /payment status|did my payment|payment go through|payment done|did i pay|have i paid|was (?:my )?payment/i

const PRODUCT_DETAIL_PATTERN =
  /\b(details?|more info(?:rmation)?|tell me (?:more )?about|describe (?:the )?|what about the|sizes?|colors?|specs?)\b/i

const DISCOVERY_PATTERN =
  /search|find|show me|looking for|available|browse|category|brand|recommend|what do you have|options?|which ones?|help me (?:find|choose)/i

const CATALOG_NOUN_PATTERN =
  /\b(shirt|shirts|tshirt|t-shirt|jersey|bat|ball|product|item|dress|shoe|pant|trouser|jacket|hoodie)\b/i

export function hasKnownProductInHistory(history) {
  return activeCatalogProducts(history).length > 0
}

export function isDiscoveryIntent(text, history = []) {
  const t = String(text || '').trim().toLowerCase()
  if (isAddToCartVariantIntent(text, history)) return false
  if (hasKnownProductInHistory(history) && /\b(add|buy|cart|them|those|these)\b/.test(t)) {
    return false
  }
  return DISCOVERY_PATTERN.test(t) || (CATALOG_NOUN_PATTERN.test(t) && !hasKnownProductInHistory(history))
}

export function isCheckoutIntent(text, history = []) {
  const t = String(text || '').trim().toLowerCase()
  const hasProduct = hasKnownProductInHistory(history)

  if (
    /my cart|checkout|proceed|ready to pay|want to pay|pay now|let'?s pay|apply coupon|remove coupon|update cart|shipping address|discount code|place (?:an )?order|deliver/i.test(
      t
    )
  ) {
    return true
  }

  if (isAddToCartVariantIntent(text, history)) {
    return true
  }

  if (/add to cart|want to buy|purchase|i'?d like to buy/i.test(t)) {
    return hasProduct || !CATALOG_NOUN_PATTERN.test(t)
  }

  if (/\b(add|buy)\b/i.test(t) || /\bwant \d|\bbuy \d/i.test(t)) {
    if (isDiscoveryIntent(t, history) || (CATALOG_NOUN_PATTERN.test(t) && !hasProduct)) {
      return false
    }
    return hasProduct
  }

  if (/you can add/i.test(t) && hasProduct) {
    return true
  }

  return false
}

export function routeIntentHeuristic(text, history = []) {
  const t = String(text || '').trim().toLowerCase()
  if (!t) return 'general'

  if (/compare|versus|\bvs\.?\b|better than|difference between|which one should/i.test(t)) {
    return 'comparison'
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
  if (PRODUCT_DETAIL_PATTERN.test(t) && hasKnownProductInHistory(history)) {
    return 'product_detail'
  }
  if (isAddToCartVariantIntent(t, history) || isCheckoutIntent(t, history)) {
    return 'checkout'
  }
  if (isDiscoveryIntent(t, history)) {
    return 'retrieval'
  }
  if (PAYMENT_STATUS_PATTERN.test(t)) {
    return 'payment'
  }
  if (/return policy|refund policy|cancellation policy|how does checkout|payment method|shipping policy/i.test(t)) {
    return 'policies'
  }
  if (PRODUCT_DETAIL_PATTERN.test(t)) {
    return 'retrieval'
  }

  return 'general'
}
