/**
 * Server-side safety net that strips hallucinated PII from tool arguments
 * before they reach the DB. Right now only address tools are covered — but
 * the pattern is easy to extend.
 *
 * If the LLM invents a phone number that neither appears in the customer's
 * recent messages nor matches their profile phone, we drop it from `args`
 * and let addressService raise a `missing: ['phone']` prompt instead.
 */

import logger from '../../utils/logger.js'
import { normalizeIndianPhone } from '../addressService.js'

const PHONE_TOKEN_PATTERN = /(?:\+?91[-\s]?)?[6-9]\d{9}/g

/**
 * Return the set of normalized phone-number tokens that appeared in the
 * customer's own messages (last N turns) OR in the very latest user message.
 */
export function extractCustomerPhones(userText, history = []) {
  const bag = new Set()
  const collect = (text) => {
    const raw = String(text || '')
    const matches = raw.match(PHONE_TOKEN_PATTERN) || []
    for (const m of matches) {
      const normalized = normalizeIndianPhone(m)
      if (normalized) bag.add(normalized)
    }
  }
  collect(userText)
  const recent = Array.isArray(history) ? history.slice(-20) : []
  for (const msg of recent) {
    if (msg?.role !== 'user') continue
    collect(msg.content)
  }
  return bag
}

/**
 * Scrub `phone` fields on address tool arguments when the LLM invented a
 * number the customer never provided. The service layer will then treat
 * phone as missing and ask for it in a follow-up.
 *
 * @param {string} toolName
 * @param {object} args
 * @param {{ userText: string, history: Array, profilePhone?: string }} ctx
 * @returns {object} possibly-mutated copy of args
 */
export function sanitizeToolArgs(toolName, args, ctx = {}) {
  if (!args || typeof args !== 'object') return args
  if (toolName !== 'add_shipping_address' && toolName !== 'update_shipping_address') {
    return args
  }
  const rawPhone = args.phone
  if (!rawPhone) return args

  const normalized = normalizeIndianPhone(rawPhone)
  if (!normalized) {
    // Already invalid — let the service reject it structurally.
    return args
  }

  const customerPhones = extractCustomerPhones(ctx.userText || '', ctx.history || [])
  const profilePhone = ctx.profilePhone ? normalizeIndianPhone(ctx.profilePhone) : null

  if (customerPhones.has(normalized)) return args
  if (profilePhone && profilePhone === normalized) return args

  logger.warn(
    `[toolArgSanitizer] stripped hallucinated phone "${rawPhone}" from ${toolName} — not present in customer input or profile`
  )
  const { phone, ...rest } = args
  void phone
  return rest
}
