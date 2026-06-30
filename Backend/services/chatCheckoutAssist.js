import logger from '../utils/logger.js'
/** Deterministic checkout fallback — orchestrated by chatDeterministicAssist.js after LangGraph. */
import { listShippingAddresses } from './addressService.js'
import { previewCheckout, checkoutFromCart } from './checkoutFromCart.js'
import { buildAddressMissingPrompt } from './chatMissingFields.js'
import { isCheckoutProceedIntent } from './chatIntentHelpers.js'
import {
  looksLikeAddressInput,
  lastAssistantAskedForAddressFields,
} from './chatAddressAssist.js'
import {
  isOrdinalPickPhrase,
  lastAssistantLooksLikeProductListing,
} from './chatGraph/productContext.js'

export { isCheckoutProceedIntent, isAffirmativeReply, conversationMentionsCheckoutPending } from './chatIntentHelpers.js'

export function alreadyHasAddressIntent(text) {
  return /\b(already (gave|have|added|saved)|existing address|saved address(?:es)?|my address(?:es)?|i think i (?:gave|have))\b/i.test(
    String(text || '')
  )
}

export function lastAssistantMentionsAddressPicker(history = []) {
  const last = [...(history || [])].reverse().find((m) => m.role === 'assistant')
  if (!last) return false
  if (last.messageKind === 'address_picker') return true
  if (last.messageKind && last.messageKind !== 'address_picker') return false
  const content = String(last.content || '').toLowerCase()
  return /saved shipping address(?:es)?|reply \*\*1\*\* or \*\*2\*\*|which address|choose (?:an |a )?address|shipping address/i.test(
    content
  )
}

export function isProductCatalogOrdinalPick(userText, history = []) {
  return isOrdinalPickPhrase(userText) && lastAssistantLooksLikeProductListing(history)
}

export function parseAddressSelection(text, addresses = [], history = []) {
  if (!addresses.length) return null
  if (isProductCatalogOrdinalPick(text, history)) return null

  const t = String(text || '').trim().toLowerCase()
  const addressPickerActive = lastAssistantMentionsAddressPicker(history)

  const numOnly = t.match(/^(\d+)$/)
  if (numOnly && addressPickerActive) {
    const choice = parseInt(numOnly[1], 10)
    const byChoice = addresses.find((a) => a.choiceNumber === choice)
    if (byChoice) return byChoice
  }

  if (addressPickerActive) {
    if (/\b(first|1st)\b/.test(t) && addresses[0]) return addresses[0]
    if (/\b(second|2nd)\b/.test(t) && addresses[1]) return addresses[1]

    for (const a of addresses) {
      const city = (a.city || '').toLowerCase()
      const province = (a.province || '').toLowerCase()
      if (city && (t === city || (t.length <= 40 && new RegExp(`\\b${city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(t)))) {
        return a
      }
      if (
        province &&
        (t === province || (t.length <= 40 && new RegExp(`\\b${province.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(t)))
      ) {
        return a
      }
    }
  }

  return null
}

export function buildAddressPickerReply(addresses) {
  const lines = addresses.map((a) => {
    const n = a.choiceNumber ?? 1
    const name = a.name ? `${a.name} · ` : ''
    return `${n}. ${name}**${a.city}, ${a.province}** — ${a.address}, ${a.postalCode}`
  })

  return `You have **${addresses.length}** saved shipping address${addresses.length === 1 ? '' : 'es'}:\n\n${lines.join('\n')}\n\nPick an address below, tap **New address**, or reply with the number or city name (e.g. Bangalore).\n\nManage addresses anytime in [My Profile](/customer-profile).`
}

function buildCheckoutBlockedReply(preview) {
  if (preview.missing?.includes('cart_items')) {
    return 'Your cart is empty. Add items first, then say **proceed to checkout**.'
  }
  if (preview.missing?.includes('shipping_address')) {
    return `${buildAddressMissingPrompt(['address', 'city', 'province', 'postal_code', 'phone'])}\n\nOr add one in [My Profile](/customer-profile).`
  }
  return preview.shippingAddressError || 'Checkout is not ready yet. Please check your cart and shipping address.'
}

function checkoutToolPayload(session) {
  return {
    success: true,
    orderId: session.orderId,
    orderNumber: session.orderNumber,
    totalPrice: session.totalPrice,
    checkoutUrl: session.url,
    checkoutSource: session.checkoutSource || 'chat',
    expiresAt: session.expiresAt,
    clientAction: 'open_checkout',
  }
}

function withAddressPickerResults(toolResults, addresses) {
  if (!addresses?.length) return toolResults
  return [
    ...toolResults,
    {
      toolName: 'get_my_addresses',
      count: addresses.length,
      addresses: addresses.map((a) => ({
        choiceNumber: a.choiceNumber,
        label: `${a.city}, ${a.province}`,
        city: a.city,
        province: a.province,
        address: a.address,
        postalCode: a.postalCode,
        name: a.name,
      })),
    },
  ]
}

function returnAddressPicker(toolResults, addresses) {
  return {
    toolResults: withAddressPickerResults(toolResults, addresses),
    reply: buildAddressPickerReply(addresses),
  }
}

function resolveAddressIndex(addr, addresses) {
  if (addr == null) return undefined
  if (Number.isFinite(addr.addressIndex)) return addr.addressIndex
  if (Number.isFinite(addr.choiceNumber)) return addr.choiceNumber - 1
  const i = addresses.indexOf(addr)
  return i >= 0 ? i : undefined
}

/**
 * Server-side checkout steps when the model skips tools (saved addresses, picker, Stripe session).
 * @returns {{ toolResults: object[], reply: string|null }}
 */
export async function runCheckoutAssist(userId, userText, messages = [], toolResults = [], options = {}) {
  if (isProductCatalogOrdinalPick(userText, messages)) {
    return { toolResults, reply: null }
  }
  // Trust the planner: if it's not a checkout-related action, skip entirely.
  const plan = options.plan
  if (plan) {
    const checkoutActions = new Set([
      'checkout',
      'address_pick',
      'view_cart',
    ])
    if (!checkoutActions.has(plan.action) && plan.action !== 'other') {
      return { toolResults, reply: null }
    }
  }

  if (plan?.action === 'address_save') {
    return { toolResults, reply: null }
  }
  if (looksLikeAddressInput(userText)) {
    return { toolResults, reply: null }
  }
  if (lastAssistantAskedForAddressFields(messages)) {
    return { toolResults, reply: null }
  }

  const hasCheckout = toolResults.some(
    (r) => r?.checkoutUrl && /^https:\/\/checkout\.stripe\.com\//i.test(r.checkoutUrl)
  )
  if (hasCheckout) {
    return { toolResults, reply: null }
  }

  const proceed = isCheckoutProceedIntent(userText, messages)
  const addressRecall = alreadyHasAddressIntent(userText)
  const { addresses = [] } = await listShippingAddresses(userId)
  const selected = parseAddressSelection(userText, addresses, messages)

  const shouldAssist = proceed || addressRecall || selected

  if (!shouldAssist) {
    return { toolResults, reply: null }
  }

  if (!addresses.length) {
    return {
      toolResults,
      reply: `${buildAddressMissingPrompt(['address', 'city', 'province', 'postal_code', 'phone'])}\n\nOr add one in [My Profile](/customer-profile).`,
    }
  }

  if ((proceed || addressRecall) && addresses.length > 1 && !selected) {
    return returnAddressPicker(toolResults, addresses)
  }

  const addressIndex =
    selected != null
      ? resolveAddressIndex(selected, addresses)
      : addresses.length === 1
        ? resolveAddressIndex(addresses[0], addresses)
        : undefined

  if (addressIndex == null) {
    return returnAddressPicker(toolResults, addresses)
  }

  const preview = await previewCheckout(userId, { addressIndex })
  if (!preview.ready) {
    return { toolResults, reply: buildCheckoutBlockedReply(preview) }
  }

  const shouldCreateSession =
    proceed || selected || (addresses.length === 1 && addressRecall)

  if (!shouldCreateSession) {
    return returnAddressPicker(toolResults, addresses)
  }

  try {
    const session = await checkoutFromCart(userId, { addressIndex })

    return {
      toolResults: [...toolResults, checkoutToolPayload(session)],
      reply: null,
    }
  } catch (err) {
    logger.error('[checkoutAssist] failed:', err.message)
    return { toolResults, reply: `I could not start checkout: ${err.message}` }
  }
}
