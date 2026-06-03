import User from '../model/User.js'

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

export async function listShippingAddresses(userId) {
  const user = await User.findById(userId).select('shippingAddresses hasShippingAddress')
  if (!user?.hasShippingAddress || !user.shippingAddresses?.length) {
    return { message: 'You have no saved shipping addresses.', addresses: [] }
  }
  return {
    addresses: user.shippingAddresses.map((addr, index) => formatAddress(addr, index)),
  }
}

export async function addShippingAddress(userId, input) {
  const user = await User.findById(userId).select('fullname phone shippingAddresses')
  if (!user) throw new Error('User not found')

  const fallbackName = splitFullName(user.fullname)
  const firstName = String(input.firstName || input.first_name || fallbackName.firstName).trim()
  const lastName = String(input.lastName || input.last_name || fallbackName.lastName).trim()
  const address = String(input.address || '').trim()
  const city = String(input.city || '').trim()
  const province = String(input.province || input.state || '').trim()
  const postalCode = String(input.postalCode || input.postal_code || input.pincode || '').trim()
  const country = normalizeCountry(input.country)
  const phone = String(input.phone || user.phone || '').trim()

  const missing = []
  if (!firstName) missing.push('first_name')
  if (!lastName) missing.push('last_name')
  if (!address) missing.push('address')
  if (!city) missing.push('city')
  if (!province) missing.push('province')
  if (!postalCode) missing.push('postal_code')
  if (!phone) missing.push('phone')

  if (missing.length) {
    throw new Error(
      `Missing required address fields: ${missing.join(', ')}. Ask the user for these details.`
    )
  }

  user.shippingAddresses.push({
    firstName,
    lastName,
    address,
    city,
    postalCode,
    province,
    country,
    phone,
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
  const user = await User.findById(userId).select('shippingAddresses hasShippingAddress')
  if (!user) throw new Error('User not found')

  const index = Number.isFinite(input.address_index) ? input.address_index : 0
  const addr = user.shippingAddresses[index]
  if (!addr) {
    throw new Error(
      `Address index ${index} not found. Use get_my_addresses to list saved addresses.`
    )
  }

  if (input.firstName || input.first_name) {
    addr.firstName = String(input.firstName || input.first_name).trim()
  }
  if (input.lastName || input.last_name) {
    addr.lastName = String(input.lastName || input.last_name).trim()
  }
  if (input.address) addr.address = String(input.address).trim()
  if (input.city) addr.city = String(input.city).trim()
  if (input.province || input.state) {
    addr.province = String(input.province || input.state).trim()
  }
  if (input.postalCode || input.postal_code || input.pincode) {
    addr.postalCode = String(
      input.postalCode || input.postal_code || input.pincode
    ).trim()
  }
  if (input.country) addr.country = normalizeCountry(input.country)
  if (input.phone) addr.phone = String(input.phone).trim()

  await user.save()

  return {
    success: true,
    message: 'Shipping address updated successfully.',
    addressIndex: index,
    address: formatAddress(addr, index),
  }
}
