import User from '../model/User.js'
import {
  clearCart,
  getCart,
  getCartOrderItems,
} from './cartService.js'
import { createCheckoutSession } from './orderCheckout.js'

export function resolveAddressIndex(user, addressIndex) {
  const count = user?.shippingAddresses?.length || 0
  if (!count) return 0
  if (Number.isFinite(addressIndex)) {
    return Math.max(0, Math.min(Math.floor(addressIndex), count - 1))
  }
  return count - 1
}

export function resolveShippingAddress(user, addressIndex) {
  if (!user?.hasShippingAddress || !user.shippingAddresses?.length) {
    return { address: null, error: 'No saved shipping addresses. Add one in your profile.' }
  }

  const index = resolveAddressIndex(user, addressIndex)
  const addr = user.shippingAddresses[index]
  if (!addr) {
    return {
      address: null,
      error: `Address index ${index} not found. You have ${user.shippingAddresses.length} saved address(es).`,
    }
  }

  return {
    address: {
      firstName: addr.firstName,
      lastName: addr.lastName,
      address: addr.address,
      city: addr.city,
      province: addr.province,
      postalCode: addr.postalCode,
      country: addr.country,
      phone: addr.phone,
    },
    index,
  }
}

export async function previewCheckout(userId, { addressIndex } = {}) {
  const user = await User.findById(userId).select(
    'hasShippingAddress shippingAddresses fullname'
  )
  const { orderItems, couponCode } = await getCartOrderItems(userId)
  const { address, error } = resolveShippingAddress(user, addressIndex)

  const cart = await getCart(userId)

  const missing = []
  if (!address) missing.push('shipping_address')
  if (!orderItems.length) missing.push('cart_items')

  return {
    ready: missing.length === 0,
    missing,
    shippingAddressError: error || null,
    shippingAddress: address,
    addressesCount: user?.shippingAddresses?.length || 0,
    cart,
    couponCode,
    itemCount: orderItems.length,
  }
}

export async function checkoutFromCart(userId, { addressIndex } = {}) {
  const user = await User.findById(userId)
  if (!user) {
    throw new Error('User not found')
  }

  const { address, error } = resolveShippingAddress(user, addressIndex)
  if (!address) {
    throw new Error(error || 'Please add a shipping address')
  }

  const { orderItems, couponCode } = await getCartOrderItems(userId)

  const session = await createCheckoutSession({
    userId,
    orderItems,
    shippingAddress: address,
    couponCode,
  })

  await clearCart(userId)

  return session
}
