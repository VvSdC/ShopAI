import User from '../model/User.js'
import { executeTool } from './chatTools.js'
import { buildAddressMissingPrompt } from './chatMissingFields.js'

export function looksLikeAddressInput(text) {
  const raw = String(text || '').trim()
  if (raw.length < 15) return false
  return /,/.test(raw) || /\b\d{6}\b/.test(raw) || /\b(street|road|lane|nagar|enclave|hyderabad|delhi|mumbai|bangalore)\b/i.test(raw)
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
  if (parts.length >= 2) {
    draft.province = parts[parts.length - 1]
    if (draft.postal_code) {
      const cityLineIdx = parts.findIndex((p) => p.includes(draft.postal_code))
      if (cityLineIdx >= 0) {
        draft.city = parts[cityLineIdx].replace(draft.postal_code, '').trim()
        draft.address = parts.slice(0, cityLineIdx).join(', ')
      }
    }
    if (!draft.city && parts.length >= 3) {
      draft.city = parts[parts.length - 2].replace(/\d{6}/, '').trim()
      draft.address = parts.slice(0, parts.length - 2).join(', ')
    }
  }

  if (!draft.address && parts.length >= 1 && !draft.city) {
    draft.address = parts.join(', ')
  }

  return draft
}

export function listMissingAddressFields(draft, userPhone = '') {
  const missing = []
  if (!draft.address || draft.address.length < 5) missing.push('address')
  if (!draft.city) missing.push('city')
  if (!draft.province) missing.push('province')
  if (!draft.postal_code || !/^\d{6}$/.test(draft.postal_code)) missing.push('postal_code')
  if (!draft.phone && !userPhone) missing.push('phone')
  return missing
}

function addressAlreadySaved(toolResults) {
  return toolResults.some(
    (r) => r?.success && (r?.toolName === 'add_shipping_address' || r?.addressIndex != null)
  )
}

export async function runAddressAssist(userId, userText, toolResults = []) {
  if (addressAlreadySaved(toolResults)) {
    return { toolResults, reply: null }
  }

  if (!looksLikeAddressInput(userText)) {
    return { toolResults, reply: null }
  }

  const user = await User.findById(userId).select('phone fullname')
  const draft = extractAddressDraft(userText)
  const missing = listMissingAddressFields(draft, user?.phone)

  if (missing.length) {
    return {
      toolResults,
      reply: buildAddressMissingPrompt(missing),
    }
  }

  const payload = {
    address: draft.address,
    city: draft.city,
    province: draft.province,
    postal_code: draft.postal_code,
    country: draft.country,
  }
  if (draft.phone) payload.phone = draft.phone

  const result = await executeTool('add_shipping_address', userId, payload)
  if (result.error) {
    const errMissing = []
    if (/postal|pin/i.test(result.error)) errMissing.push('postal_code')
    if (/phone/i.test(result.error)) errMissing.push('phone')
    if (/address/i.test(result.error)) errMissing.push('address')
    if (/city/i.test(result.error)) errMissing.push('city')
    if (/province|state/i.test(result.error)) errMissing.push('province')
    if (errMissing.length) {
      return { toolResults, reply: buildAddressMissingPrompt([...new Set(errMissing)]) }
    }
    return { toolResults, reply: result.error }
  }

  return {
    toolResults: [...toolResults, { ...result, toolName: 'add_shipping_address' }],
    reply: `Saved your delivery address:\n**${draft.address}, ${draft.city}, ${draft.province} ${draft.postal_code}**\n\nSay **proceed to checkout** when you're ready — I'll open secure Stripe payment.`,
  }
}
