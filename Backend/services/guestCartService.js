import Product from '../model/Product.js'
import { resolveOptionMatch } from './cartService.js'
import { resolveSizeForProduct } from './cartVariantMatch.js'
import { findLiveCouponByCode } from '../utils/couponQueries.js'
import { isCouponExpired, isCouponLive, isCouponNotStarted } from '../utils/couponDates.js'

function lineKey(item) {
  return `${String(item._id)}|${item.color}|${item.size}`
}

function normalizeGuestItem(item) {
  const qty = Math.max(1, Number(item.qty) || 1)
  const price = Number(item.price) || 0
  return {
    _id: String(item._id),
    name: String(item.name || ''),
    qty,
    price,
    totalPrice: Number.isFinite(Number(item.totalPrice)) ? Number(item.totalPrice) : qty * price,
    color: String(item.color),
    size: String(item.size),
    description: String(item.description || ''),
    image: String(item.image || ''),
  }
}

export function createGuestCartState(items = [], couponCode = null) {
  return {
    items: (items || []).map(normalizeGuestItem).filter((item) => item._id && item.color && item.size),
    couponCode: couponCode ? String(couponCode).trim().toUpperCase() : null,
  }
}

function computeTotals(items, discountRate = 0) {
  const subtotal = items.reduce((sum, item) => sum + (item.totalPrice || 0), 0)
  const discountAmount =
    discountRate > 0 ? Math.round(subtotal * discountRate * 100) / 100 : 0
  const total =
    discountRate > 0
      ? Math.round(subtotal * (1 - discountRate) * 100) / 100
      : subtotal
  return { subtotal, discountAmount, total }
}

async function resolveGuestDiscount(couponCode) {
  if (!couponCode) return { discountRate: 0, discountPercent: 0 }
  const coupon = await findLiveCouponByCode(couponCode)
  if (!coupon || isCouponNotStarted(coupon) || isCouponExpired(coupon) || !isCouponLive(coupon)) {
    return { discountRate: 0, discountPercent: 0 }
  }
  const discountPercent = coupon.discount
  return { discountRate: discountPercent / 100, discountPercent }
}

export async function formatGuestCartResponse(state) {
  const items = state.items || []
  const { discountRate } = await resolveGuestDiscount(state.couponCode)
  const { subtotal, discountAmount, total } = computeTotals(items, discountRate)
  const totalUnits = items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0)

  return {
    items,
    isEmpty: items.length === 0,
    lineCount: items.length,
    totalUnits,
    subtotal,
    discountAmount,
    total,
    couponCode: state.couponCode || null,
  }
}

export async function guestGetCart(state) {
  return formatGuestCartResponse(state)
}

export async function guestAddToCart(state, args) {
  const qty = Math.max(1, Number(args.qty) || 1)
  const productId = args.product_id
  const product = await Product.findById(productId).select(
    'name price description images colors sizes sizeMeasurementType'
  )
  if (!product) {
    return { error: 'Product not found.' }
  }

  const matchedColor = resolveOptionMatch(args.color, product.colors)
  const matchedSize = resolveSizeForProduct(args.size, product)
  if (!matchedColor || !matchedSize) {
    return {
      error: `Invalid variant. Colors: ${product.colors.join(', ')}. Sizes: ${(product.sizes || []).join(', ') || 'One Size'}.`,
    }
  }

  const key = `${String(productId)}|${matchedColor}|${matchedSize}`
  const existingIndex = state.items.findIndex((item) => lineKey(item) === key)
  const existing = existingIndex >= 0 ? state.items[existingIndex] : null

  if (existing) {
    existing.qty += qty
    existing.totalPrice = existing.qty * existing.price
  } else {
    state.items.push(
      normalizeGuestItem({
        _id: productId,
        name: product.name,
        qty,
        price: product.price,
        totalPrice: product.price * qty,
        color: matchedColor,
        size: matchedSize,
        description: product.description || '',
        image: product.images?.[0] || '',
      })
    )
  }

  const cart = await formatGuestCartResponse(state)
  return {
    success: true,
    message: existing ? 'Cart quantity updated for this item' : 'Item added to cart',
    cart,
    clientAction: 'sync_local_cart',
  }
}

export async function guestUpdateCartItem(state, args) {
  const productId = String(args.product_id)
  const color = args.color
  const size = args.size
  const qty = Number(args.qty)

  if (qty === 0) {
    state.items = state.items.filter(
      (item) => !(String(item._id) === productId && item.color === color && item.size === size)
    )
  } else {
    const item = state.items.find(
      (line) => String(line._id) === productId && line.color === color && line.size === size
    )
    if (!item) {
      return { error: 'Item not found in cart.' }
    }
    item.qty = qty
    item.totalPrice = item.qty * item.price
  }

  const cart = await formatGuestCartResponse(state)
  return {
    success: true,
    message: qty === 0 ? 'Item removed from cart' : 'Cart updated',
    cart,
    clientAction: 'sync_local_cart',
  }
}

export async function guestApplyCoupon(state, code) {
  const normalized = String(code || '').trim().toUpperCase()
  if (!normalized) {
    return { error: 'Coupon code is required.' }
  }
  const coupon = await findLiveCouponByCode(normalized)
  if (!coupon || isCouponNotStarted(coupon) || isCouponExpired(coupon) || !isCouponLive(coupon)) {
    return { error: 'Coupon does not exist or is not valid.' }
  }
  state.couponCode = normalized
  const cart = await formatGuestCartResponse(state)
  return {
    success: true,
    message: `Coupon ${normalized} applied`,
    cart,
    clientAction: 'sync_local_cart',
  }
}

export async function guestRemoveCoupon(state) {
  state.couponCode = null
  const cart = await formatGuestCartResponse(state)
  return {
    success: true,
    message: 'Coupon removed from cart',
    cart,
    clientAction: 'sync_local_cart',
  }
}

import { buildSignInRequiredToolResult } from './guestChatRestrictions.js'

export function guestCheckoutBlocked(pendingQuery = null) {
  return buildSignInRequiredToolResult(pendingQuery, { route: 'checkout' })
}
