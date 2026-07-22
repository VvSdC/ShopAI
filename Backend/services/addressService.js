import User from '../model/User.js'

const INDIAN_PHONE_PATTERN = /^(?:\+?91[-\s]?)?[6-9]\d{9}$/
const POSTAL_CODE_PATTERN = /^\d{6}$/
const NAME_PATTERN = /^[a-zA-Z][a-zA-Z\s'.-]{0,49}$/

function splitFullName(fullname) {
  const parts = String(fullname || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (!parts.length) return { firstName: '', lastName: '' }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  }
}

function normalizeCountry(country) {
  const value = String(country || '').trim()
  if (!value) return 'IN'
  const lower = value.toLowerCase()
  if (lower === 'india' || lower === 'in') return 'IN'
  return value
}

/**
 * Normalize an Indian phone number. Strips spaces/dashes and the `+91`/`91`
 * country-code prefix and returns the bare 10-digit mobile number. Returns
 * null when the input does not look like a valid Indian mobile number — the
 * caller must treat that as `missing` (never persist an invented number).
 */
export function normalizeIndianPhone(raw) {
  const trimmed = String(raw || '').replace(/[\s-]/g, '').trim()
  if (!trimmed) return null
  if (!INDIAN_PHONE_PATTERN.test(trimmed)) return null
  return trimmed.replace(/^\+?91/, '')
}

function formatAddress(addr, index) {
  return {
    addressIndex: index,
    choiceNumber: index + 1,
    id: addr._id,
    name: `${addr.firstName || ''} ${addr.lastName || ''}`.trim(),
    address: addr.address,
    city: addr.city,
    province: addr.province,
    postalCode: addr.postalCode,
    country: addr.country,
    phone: addr.phone,
  }
}

/**
 * Structured validation error. Callers (chat tools, controllers) should
 * translate `missing`/`invalid` into user-facing prompts instead of showing
 * the raw string. Prevents the LLM from having to guess field values.
 */
export class AddressValidationError extends Error {
  constructor({ missing = [], invalid = [], message } = {}) {
    const summary =
      message ||
      [
        missing.length ? `Missing: ${missing.join(', ')}` : null,
        invalid.length ? `Invalid: ${invalid.join(', ')}` : null,
      ]
        .filter(Boolean)
        .join('. ') ||
      'Address validation failed.'
    super(summary)
    this.name = 'AddressValidationError'
    this.missing = missing
    this.invalid = invalid
  }
}

export async function listShippingAddresses(userId) {
  const user = await User.findById(userId).select('shippingAddresses hasShippingAddress')
  if (!user?.hasShippingAddress || !user.shippingAddresses?.length) {
    return { message: 'You have no saved shipping addresses.', addresses: [] }
  }
  return {
    addresses: user.shippingAddresses.map((addr, index) => formatAddress(addr, index)),
  }
}

/**
 * Validate an address payload before persisting. Returns a normalized object
 * on success or throws AddressValidationError with `missing` and `invalid`
 * arrays so the caller can ask the user for exactly the fields at fault
 * instead of accepting hallucinated values from the LLM.
 */
export function validateAddressPayload(input = {}, profile = {}) {
  const fallbackName = splitFullName(profile.fullname)
  const firstName = String(input.firstName || input.first_name || fallbackName.firstName || '').trim()
  const lastName = String(input.lastName || input.last_name || fallbackName.lastName || '').trim()
  const address = String(input.address || '').trim()
  const city = String(input.city || '').trim()
  const province = String(input.province || input.state || '').trim()
  const postalCodeRaw = String(input.postalCode || input.postal_code || input.pincode || '').trim()
  const country = normalizeCountry(input.country)

  const explicitPhoneRaw = String(input.phone || '').trim()
  const providedPhone = explicitPhoneRaw ? normalizeIndianPhone(explicitPhoneRaw) : null
  const profilePhone = profile.phone ? normalizeIndianPhone(profile.phone) : null
  const phone = providedPhone || profilePhone || null

  const missing = []
  const invalid = []

  if (!firstName) missing.push('first_name')
  else if (!NAME_PATTERN.test(firstName)) invalid.push('first_name')

  if (!lastName) missing.push('last_name')
  else if (!NAME_PATTERN.test(lastName)) invalid.push('last_name')

  if (!address) missing.push('address')
  else if (address.length < 5) invalid.push('address')

  if (!city) missing.push('city')
  else if (city.length < 2 || /\d/.test(city)) invalid.push('city')

  if (!province) missing.push('province')
  else if (province.length < 2 || /\d/.test(province)) invalid.push('province')

  if (!postalCodeRaw) missing.push('postal_code')
  else if (!POSTAL_CODE_PATTERN.test(postalCodeRaw)) invalid.push('postal_code')

  if (!phone) {
    // Distinguish "user typed something but it wasn't valid" from "nothing given at all".
    if (explicitPhoneRaw) invalid.push('phone')
    else missing.push('phone')
  }

  if (missing.length || invalid.length) {
    throw new AddressValidationError({ missing, invalid })
  }

  return {
    firstName,
    lastName,
    address,
    city,
    province,
    postalCode: postalCodeRaw,
    country,
    phone,
  }
}

export async function addShippingAddress(userId, input) {
  const user = await User.findById(userId).select('fullname phone shippingAddresses')
  if (!user) throw new Error('User not found')

  const validated = validateAddressPayload(input, { fullname: user.fullname, phone: user.phone })

  user.shippingAddresses.push({
    firstName: validated.firstName,
    lastName: validated.lastName,
    address: validated.address,
    city: validated.city,
    postalCode: validated.postalCode,
    province: validated.province,
    country: validated.country,
    phone: validated.phone,
  })
  user.hasShippingAddress = true
  await user.save()

  const index = user.shippingAddresses.length - 1
  const saved = user.shippingAddresses[index]

  return {
    success: true,
    message: 'Shipping address saved successfully.',
    addressIndex: index,
    address: formatAddress(saved, index),
  }
}

export async function updateShippingAddress(userId, input) {
  const user = await User.findById(userId).select('shippingAddresses hasShippingAddress phone fullname')
  if (!user) throw new Error('User not found')

  const index = Number.isFinite(input.address_index) ? input.address_index : 0
  const addr = user.shippingAddresses[index]
  if (!addr) {
    throw new Error(
      `Address index ${index} not found. Use get_my_addresses to list saved addresses.`
    )
  }

  const missing = []
  const invalid = []

  if (input.firstName || input.first_name) {
    const v = String(input.firstName || input.first_name).trim()
    if (!NAME_PATTERN.test(v)) invalid.push('first_name')
    else addr.firstName = v
  }
  if (input.lastName || input.last_name) {
    const v = String(input.lastName || input.last_name).trim()
    if (!NAME_PATTERN.test(v)) invalid.push('last_name')
    else addr.lastName = v
  }
  if (input.address !== undefined) {
    const v = String(input.address).trim()
    if (!v) missing.push('address')
    else if (v.length < 5) invalid.push('address')
    else addr.address = v
  }
  if (input.city !== undefined) {
    const v = String(input.city).trim()
    if (!v) missing.push('city')
    else if (v.length < 2 || /\d/.test(v)) invalid.push('city')
    else addr.city = v
  }
  if (input.province !== undefined || input.state !== undefined) {
    const v = String(input.province || input.state).trim()
    if (!v) missing.push('province')
    else if (v.length < 2 || /\d/.test(v)) invalid.push('province')
    else addr.province = v
  }
  if (input.postalCode !== undefined || input.postal_code !== undefined || input.pincode !== undefined) {
    const v = String(input.postalCode || input.postal_code || input.pincode).trim()
    if (!v) missing.push('postal_code')
    else if (!POSTAL_CODE_PATTERN.test(v)) invalid.push('postal_code')
    else addr.postalCode = v
  }
  if (input.country) addr.country = normalizeCountry(input.country)
  if (input.phone !== undefined) {
    const raw = String(input.phone).trim()
    const normalized = normalizeIndianPhone(raw)
    if (!normalized) invalid.push('phone')
    else addr.phone = normalized
  }

  if (missing.length || invalid.length) {
    throw new AddressValidationError({ missing, invalid })
  }

  await user.save()

  return {
    success: true,
    message: 'Shipping address updated successfully.',
    addressIndex: index,
    address: formatAddress(addr, index),
  }
}
