/** Deterministic address parsing fallback — orchestrated by chatDeterministicAssist.js after LangGraph. */
import User from '../model/User.js'
import { executeTool } from './chatTools.js'
import { buildAddressMissingPrompt, buildAddressInvalidPrompt } from './chatMissingFields.js'
import { isGuestChatUser } from './guestCartContext.js'
import { normalizeIndianPhone } from './addressService.js'

export function looksLikeAddressInput(text) {
  const raw = String(text || '').trim()
  if (raw.length < 15) return false
  return (
    /,/.test(raw) ||
    /\b\d{6}\b/.test(raw) ||
    /\b(street|road|lane|nagar|enclave|hyderabad|delhi|mumbai|bangalore)\b/i.test(raw)
  )
}

export function lastAssistantAskedForAddressFields(history = []) {
  const last = [...(history || [])].reverse().find((m) => m.role === 'assistant')
  if (!last) return false
  const content = String(last.content || '').toLowerCase()
  return /save your delivery address|share these details|street address|house number|pin\s*\/\s*postal|postal code|phone number|\bstate\b|province|delivery address/i.test(
    content
  )
}

export function extractAddressDraft(text) {
  const raw = String(text || '')
    .replace(/\n/g, ', ')
    .trim()

  const draft = {
    address: '',
    city: '',
    province: '',
    postal_code: '',
    phone: '',
    country: 'IN',
  }

  const pinMatch = raw.match(/\b(\d{6})\b/)
  if (pinMatch) draft.postal_code = pinMatch[1]

  const phoneMatch = raw.match(/(?:\+91[\s-]?)?[6-9]\d{9}\b/)
  if (phoneMatch) draft.phone = phoneMatch[0].replace(/\s+/g, '')

  const parts = raw.split(',').map((p) => p.trim()).filter(Boolean)
  if (parts.length < 2) {
    if (parts.length === 1) draft.address = parts[0]
    return draft
  }

  const lastPart = parts[parts.length - 1]
  const lastHasPin = draft.postal_code && lastPart.includes(draft.postal_code)

  if (lastHasPin) {
    draft.city = lastPart.replace(draft.postal_code, '').trim()
    draft.address = parts.slice(0, parts.length - 1).join(', ')
    return draft
  }

  draft.province = lastPart.replace(/\d{6}/, '').trim()
  if (parts.length >= 3) {
    draft.city = parts[parts.length - 2].replace(/\d{6}/, '').trim()
    draft.address = parts.slice(0, parts.length - 2).join(', ')
  } else {
    draft.city = draft.province
    draft.province = ''
    draft.address = parts[0]
  }

  return draft
}

export function listMissingAddressFields(draft, userPhone = '') {
  const missing = []
  if (!draft.address || draft.address.length < 5) missing.push('address')
  if (!draft.city) missing.push('city')
  if (!draft.province) missing.push('province')
  if (!draft.postal_code || !/^\d{6}$/.test(draft.postal_code)) missing.push('postal_code')

  // A profile phone counts only when it looks like a valid Indian mobile.
  const draftPhoneOk = draft.phone && normalizeIndianPhone(draft.phone)
  const profilePhoneOk = userPhone && normalizeIndianPhone(userPhone)
  if (!draftPhoneOk && !profilePhoneOk) missing.push('phone')
  return missing
}

function lastUserAddressDraft(history = []) {
  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i]
    if (msg?.role === 'user' && looksLikeAddressInput(msg.content)) {
      return extractAddressDraft(msg.content)
    }
  }
  return null
}

function applyPartialAddressReply(draft, text) {
  const t = String(text || '').trim()
  const next = { ...draft }

  const pin = t.match(/\b(\d{6})\b/)
  if (pin) next.postal_code = pin[1]

  const phone = t.match(/(?:\+91[\s-]?)?[6-9]\d{9}\b/)
  if (phone) next.phone = phone[0].replace(/\s+/g, '')

  if (/^[a-z][a-z\s]{1,38}$/i.test(t) && !/\d/.test(t)) {
    if (!next.province) next.province = t
    else if (!next.city) next.city = t
  }

  return next
}

function addressAlreadySaved(toolResults) {
  return toolResults.some(
    (r) => r?.success && (r?.toolName === 'add_shipping_address' || r?.addressIndex != null)
  )
}

async function saveAddressDraft(userId, draft, user, toolResults) {
  const missing = listMissingAddressFields(draft, user?.phone)
  if (missing.length) {
    return { toolResults, reply: buildAddressMissingPrompt(missing) }
  }

  const payload = {
    address: draft.address,
    city: draft.city,
    province: draft.province,
    postal_code: draft.postal_code,
    country: draft.country,
  }
  // Only forward a phone if the customer actually gave one — the service will
  // fall back to the profile phone. Never send `''` or a non-Indian number.
  const normalizedPhone = draft.phone ? normalizeIndianPhone(draft.phone) : null
  if (normalizedPhone) payload.phone = normalizedPhone

  const result = await executeTool('add_shipping_address', userId, payload)
  if (result?.error === 'address_validation_failed') {
    const missingFields = Array.isArray(result.missing) ? result.missing : []
    const invalidFields = Array.isArray(result.invalid) ? result.invalid : []
    const parts = []
    if (invalidFields.length) parts.push(buildAddressInvalidPrompt(invalidFields))
    if (missingFields.length) parts.push(buildAddressMissingPrompt(missingFields))
    return {
      toolResults,
      reply: parts.filter(Boolean).join('\n\n') || 'Please share those address details again.',
    }
  }
  if (result?.error) {
    // Legacy string-error path (kept for defensive parity).
    const errMissing = []
    if (/postal|pin/i.test(result.error)) errMissing.push('postal_code')
    if (/phone/i.test(result.error)) errMissing.push('phone')
    if (/address/i.test(result.error)) errMissing.push('address')
    if (/city/i.test(result.error)) errMissing.push('city')
    if (/province|state/i.test(result.error)) errMissing.push('province')
    if (errMissing.length) {
      return { toolResults, reply: buildAddressMissingPrompt([...new Set(errMissing)]) }
    }
    return { toolResults, reply: result.message || result.error }
  }

  return {
    toolResults: [...toolResults, { ...result, toolName: 'add_shipping_address' }],
    reply: `Saved your delivery address:\n**${draft.address}, ${draft.city}, ${draft.province} ${draft.postal_code}**\n\nSay **proceed to checkout** when you're ready — I'll open secure Stripe payment.`,
  }
}

export async function runAddressAssist(userId, userText, toolResults = [], options = {}) {
  if (isGuestChatUser(userId)) {
    return { toolResults, reply: null }
  }

  const { history = [], plan = null } = options

  if (addressAlreadySaved(toolResults)) {
    return { toolResults, reply: null }
  }

  const user = await User.findById(userId).select('phone fullname')
  const collectingAddress =
    plan?.action === 'address_save' || lastAssistantAskedForAddressFields(history)

  let draft = null

  if (looksLikeAddressInput(userText)) {
    draft = extractAddressDraft(userText)
  } else if (collectingAddress && lastAssistantAskedForAddressFields(history)) {
    const prior = lastUserAddressDraft(history)
    if (prior) {
      draft = applyPartialAddressReply(prior, userText)
    }
  }

  if (!draft) {
    return { toolResults, reply: null }
  }

  return saveAddressDraft(userId, draft, user, toolResults)
}
