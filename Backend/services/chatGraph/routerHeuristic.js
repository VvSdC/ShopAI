import { normalizeChatInput } from '../../utils/chatInputNormalize.js'
import {
  activeCatalogProducts,
  isAddToCartVariantIntent,
  isCatalogOrdinalSelection,
  isOrdinalPickPhrase,
  lastAssistantLooksLikeProductListing,
  lastAssistantMessageKind,
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
  /\b(details?|more info(?:rmation)?|tell me (?:more )?about|describe (?:the )?|what about the|what (?:sizes?|colors?|are the (?:sizes?|colors?))|available (?:sizes?|colors?)|size (?:chart|guide)|specs?(?:ifications?)?)\b/i

const VARIANT_REPLY_HINT_PATTERN =
  /(\d+|\bsmall\b|\bmedium\b|\blarge\b|\bxl\b|\bxxl\b|\bone size\b|\bxs\b|\bs\b|\bm\b|\bl\b|red|blue|green|black|white|yellow|orange|pink|grey|gray|brown|navy|maroon)/i

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

const AFFIRMATIVE_PATTERN =
  /^(?:yes|yep|yeah|ok(?:ay)?|sure|proceed|go ahead|confirm|sounds good|that'?s fine|do it|please)[\s!.?]*$/i

const AMBIGUOUS_REFERENCE_PATTERN =
  /\b(it|this one|that one|the first one|the second one|same one)\b/i

function normalizeGreetingText(text) {
  return String(text || '')
    .trim()
    .replace(/^[\s]+|[\s!?.,]+$/g, '')
    .trim()
    .toLowerCase()
}

function isGreeting(text) {
  const t = normalizeGreetingText(text)
  return /^(?:hi|hello|hey|good (?:morning|afternoon|evening)|thanks|thank you|how are you|who are you|what can you do|help(?: me)?|what do you do)$/.test(
    t
  )
}

function isAffirmative(text) {
  return AFFIRMATIVE_PATTERN.test(String(text || '').trim())
}

function lastAssistantMentionsCheckout(history) {
  const last = [...(history || [])].reverse().find((m) => m.role === 'assistant')
  if (!last) return false
  const content = String(last.content || '').toLowerCase()
  return /checkout|proceed (?:with|to) payment|place (?:the )?order|shipping address|deliver|pay now|ready to pay|apply coupon|confirm(?: your)? order|shall i proceed/i.test(
    content
  )
}

function isHighConfidenceCheckout(text, history) {
  const t = String(text || '').trim().toLowerCase()
  if (isAddToCartVariantIntent(text, history)) return true
  if (
    /my cart|checkout|proceed|ready to pay|want to pay|pay now|let'?s pay|apply coupon|remove coupon|update cart|shipping address|discount code|place (?:an )?order|deliver/i.test(
      t
    )
  ) {
    return true
  }
  if (!hasKnownProductInHistory(history)) return false
  if (/add to cart|want to buy|purchase|i'?d like to buy/i.test(t)) return true
  if (/\b(add|buy)\b/i.test(t) || /\bwant \d|\bbuy \d/i.test(t)) return true
  if (/you can add/i.test(t)) return true
  return false
}

/**
 * After a product_detail card, a short variant reply ("2 bats 28 size",
 * "size M red", "1 large") is a cart variant — NOT another detail request.
 * The word "size" alone (in any language) used to land here as product_detail
 * because of the old PRODUCT_DETAIL_PATTERN. Now we treat it as checkout.
 */
function isVariantReplyAfterProductDetail(text, history) {
  if (lastAssistantMessageKind(history) !== 'product_detail') return false
  const t = String(text || '').trim().toLowerCase()
  if (!t) return false
  if (PRODUCT_DETAIL_PATTERN.test(t) && !VARIANT_REPLY_HINT_PATTERN.test(t)) return false
  return VARIANT_REPLY_HINT_PATTERN.test(t)
}

/**
 * Fast path for intent routing. Returns high confidence when heuristic signals are
 * unambiguous; low confidence triggers LLM disambiguation in intentClassifier.
 */
export function classifyIntentHeuristic(text, history = []) {
  const normalizedText = normalizeChatInput(text)
  const routeText = normalizedText !== String(text || '').trim() ? normalizedText : text

  if (isVariantReplyAfterProductDetail(routeText, history)) {
    return { route: 'checkout', confidence: 'high', reason: 'heuristic_variant_after_detail' }
  }

  const route = routeIntentHeuristic(routeText, history)
  const t = String(routeText || '').trim()

  if (isCatalogOrdinalSelection(t, history)) {
    const route = /\b(add|put)\b/i.test(t.toLowerCase()) ? 'checkout' : 'product_detail'
    return { route, confidence: 'high', reason: 'heuristic_catalog_ordinal' }
  }

  if (isOrdinalPickPhrase(t) && lastAssistantLooksLikeProductListing(history)) {
    const route = /\b(add|put)\b/i.test(t.toLowerCase()) ? 'checkout' : 'product_detail'
    return { route, confidence: 'high', reason: 'heuristic_ordinal_listing_pick' }
  }

  if (isAffirmative(t)) {
    if (lastAssistantMentionsCheckout(history)) {
      return { route: 'checkout', confidence: 'high', reason: 'heuristic_affirmative_checkout' }
    }
    return { route, confidence: 'low', reason: 'ambiguous_affirmative' }
  }

  if (route === 'general' && isAmbiguousReferencePattern(t) && hasKnownProductInHistory(history)) {
    return { route, confidence: 'low', reason: 'ambiguous_reference' }
  }

  switch (route) {
    case 'comparison':
    case 'order_update':
    case 'order_summary':
    case 'payment':
    case 'policies':
      return { route, confidence: 'high', reason: `heuristic_${route}` }

    case 'product_detail':
      if (PRODUCT_DETAIL_PATTERN.test(t) && hasKnownProductInHistory(history)) {
        return { route, confidence: 'high', reason: 'heuristic_product_detail' }
      }
      break

    case 'checkout':
      if (isHighConfidenceCheckout(routeText, history)) {
        return { route, confidence: 'high', reason: 'heuristic_checkout' }
      }
      break

    case 'retrieval':
      if (isDiscoveryIntent(routeText, history) || PRODUCT_DETAIL_PATTERN.test(t)) {
        return { route, confidence: 'high', reason: 'heuristic_retrieval' }
      }
      break

    case 'general':
      if (isGreeting(t)) {
        return { route, confidence: 'high', reason: 'heuristic_greeting' }
      }
      break
  }

  return { route, confidence: 'low', reason: 'heuristic_uncertain' }
}

function isAmbiguousReferencePattern(text) {
  return AMBIGUOUS_REFERENCE_PATTERN.test(String(text || '').trim().toLowerCase())
}

export function routeIntentHeuristic(text, history = []) {
  const t = String(text || '').trim().toLowerCase()
  if (!t) return 'general'

  if (isVariantReplyAfterProductDetail(text, history)) {
    return 'checkout'
  }

  if (isCatalogOrdinalSelection(text, history)) {
    return /\b(add|put)\b/i.test(t) ? 'checkout' : 'product_detail'
  }

  if (isOrdinalPickPhrase(text) && lastAssistantLooksLikeProductListing(history)) {
    return /\b(add|put)\b/i.test(t) ? 'checkout' : 'product_detail'
  }

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
