const FIELD_LABELS = {
  address: 'street address / house number and area',
  city: 'city',
  province: 'state',
  postal_code: 'PIN / postal code (6 digits)',
  phone: 'phone number (10-digit Indian mobile, e.g. 98XXXXXXXX)',
  first_name: 'first name',
  last_name: 'last name',
  size: 'size',
  color: 'color',
  qty: 'quantity',
  product: 'which product you want',
}

const INVALID_HINTS = {
  postal_code: 'PIN / postal code must be exactly 6 digits',
  phone: 'phone number must be a 10-digit Indian mobile (starts 6, 7, 8, or 9; optional +91)',
  first_name: 'first name has invalid characters',
  last_name: 'last name has invalid characters',
  city: 'city name looks off — please retype',
  province: 'state / province looks off — please retype',
  address: 'street address looks too short',
}

export function buildMissingFieldsPrompt(context, missingKeys) {
  const labels = missingKeys.map((key) => FIELD_LABELS[key] || key)
  if (!labels.length) return null

  const intro = context
    ? `To ${context}, I still need a few details:`
    : 'I need a few more details to continue:'

  const bullets = labels.map((label) => `- **${label}**`).join('\n')
  return `${intro}\n\n${bullets}\n\nYou can reply in one message — any format is fine.`
}

export function buildAddressMissingPrompt(missingKeys) {
  return buildMissingFieldsPrompt('save your delivery address', missingKeys)
}

export function buildAddressInvalidPrompt(invalidKeys) {
  const items = (invalidKeys || [])
    .map((key) => INVALID_HINTS[key] || `${FIELD_LABELS[key] || key} is invalid`)
    .filter(Boolean)
  if (!items.length) return null
  const bullets = items.map((i) => `- ${i}`).join('\n')
  return `A couple of the details you shared don't look right:\n\n${bullets}\n\nCould you resend those in one message?`
}

export function buildCartMissingPrompt(productName, missingKeys) {
  const base = buildMissingFieldsPrompt(
    `add **${productName}** to your cart`,
    missingKeys
  )
  return base
}
