const FIELD_LABELS = {
  address: 'street address / house number and area',
  city: 'city',
  province: 'state',
  postal_code: 'PIN / postal code (6 digits)',
  phone: 'phone number',
  first_name: 'first name',
  last_name: 'last name',
  size: 'size',
  color: 'color',
  qty: 'quantity',
  product: 'which product you want',
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

export function buildCartMissingPrompt(productName, missingKeys) {
  const base = buildMissingFieldsPrompt(
    `add **${productName}** to your cart`,
    missingKeys
  )
  return base
}
