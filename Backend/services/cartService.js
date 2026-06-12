import Cart from '../model/Cart.js'
import Product from '../model/Product.js'
import {
  findLiveCouponByCode,
  normalizeCouponCode,
} from '../utils/couponQueries.js'
import {
  isCouponExpired,
  isCouponLive,
  isCouponNotStarted,
} from '../utils/couponDates.js'

export function productIdKey(id) {
  if (id == null) return ''
  return String(id)
}

function lineKey(item) {
  return `${productIdKey(item._id)}|${item.color}|${item.size}`
}

function isDuplicateKeyError(err) {
  return err?.code === 11000
}

async function findOrCreateCart(userId) {
  let cart = await Cart.findOne({ user: userId })
  if (cart) return cart

  try {
    return await Cart.create({ user: userId, items: [], couponCode: null })
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      cart = await Cart.findOne({ user: userId })
      if (cart) return cart
    }
    throw err
  }
}

async function resolveCouponDiscount(couponCode) {
  if (!couponCode) {
    return { coupon: null, discountPercent: 0, discountRate: 0 }
  }

  const coupon = await findLiveCouponByCode(couponCode)
  if (!coupon) {
    throw new Error('Coupon does not exist or is not valid')
  }
  if (isCouponNotStarted(coupon)) {
    throw new Error('This coupon is not active yet')
  }
  if (isCouponExpired(coupon)) {
    throw new Error('This coupon has expired')
  }
  if (!isCouponLive(coupon)) {
    throw new Error('This coupon is not valid')
  }

  const discountPercent = coupon.discount
  return {
    coupon,
    discountPercent,
    discountRate: discountPercent / 100,
  }
}

function computeTotals(items, discountRate) {
  const subtotal = items.reduce((sum, item) => sum + (item.totalPrice || 0), 0)
  const discountAmount =
    discountRate > 0
      ? Math.round(subtotal * discountRate * 100) / 100
      : 0
  const total =
    discountRate > 0
      ? Math.round(subtotal * (1 - discountRate) * 100) / 100
      : subtotal

  return { subtotal, discountAmount, total }
}

export function formatCartPayload(cart, discountMeta = null) {
  const discountRate = discountMeta?.discountRate ?? 0
  const { subtotal, discountAmount, total } = computeTotals(cart.items, discountRate)
  const itemCount = cart.items.reduce((sum, i) => sum + (i.qty || 0), 0)

  return {
    items: cart.items.map((item) => ({
      _id: String(item._id),
      name: item.name,
      qty: item.qty,
      price: item.price,
      totalPrice: item.totalPrice,
      color: item.color,
      size: item.size,
      description: item.description,
      image: item.image,
    })),
    couponCode: cart.couponCode || null,
    couponDiscount: discountMeta?.discountPercent ?? null,
    subtotal,
    discountAmount,
    total,
    lineCount: cart.items.length,
    totalUnits: itemCount,
    itemCount,
    isEmpty: cart.items.length === 0,
  }
}

export async function getCart(userId) {
  const cart = await findOrCreateCart(userId)
  let discountMeta = { discountRate: 0, discountPercent: 0 }
  if (cart.couponCode) {
    try {
      discountMeta = await resolveCouponDiscount(cart.couponCode)
    } catch {
      cart.couponCode = null
      await cart.save()
    }
  }
  return formatCartPayload(cart, discountMeta)
}

export function resolveOptionMatch(requested, options) {
  const normalized = String(requested || '').trim().toLowerCase()
  if (!normalized) return null

  const exact = options.find((option) => option.trim().toLowerCase() === normalized)
  if (exact) return exact

  const partial = options.find((option) => {
    const value = option.trim().toLowerCase()
    return value.includes(normalized) || normalized.includes(value)
  })
  return partial || null
}

export async function addItem(userId, { productId, color, size, qty = 1 }) {
  const product = await Product.findById(productId)
  if (!product) {
    throw new Error('Product not found')
  }

  const matchedColor = resolveOptionMatch(color, product.colors)
  const matchedSize = resolveOptionMatch(size, product.sizes)

  if (!matchedColor) {
    throw new Error(
      `Invalid color. Available colors: ${product.colors.join(', ')}`
    )
  }
  if (!matchedSize) {
    throw new Error(
      `Invalid size. Available sizes: ${product.sizes.join(', ')}`
    )
  }

  const qtyLeft = product.totalQty - product.totalSold
  if (qtyLeft <= 0) {
    throw new Error('Product is out of stock')
  }

  const finalQty = Math.min(Math.max(1, Number(qty) || 1), qtyLeft)
  const cart = await findOrCreateCart(userId)
  const newLine = {
    _id: product._id,
    name: product.name,
    qty: finalQty,
    price: product.price,
    totalPrice: product.price * finalQty,
    color: matchedColor,
    size: matchedSize,
    description: product.description || '',
    image: product.images?.[0] || '',
  }

  const key = lineKey(newLine)
  const existingIndex = cart.items.findIndex((item) => lineKey(item) === key)
  if (existingIndex >= 0) {
    const mergedQty = Math.min(cart.items[existingIndex].qty + finalQty, qtyLeft)
    cart.items[existingIndex].qty = mergedQty
    cart.items[existingIndex].price = product.price
    cart.items[existingIndex].totalPrice = product.price * mergedQty
  } else {
    cart.items.push(newLine)
  }

  await cart.save()
  return getCart(userId)
}

export async function updateItemQty(userId, { productId, color, size, qty }) {
  const cart = await findOrCreateCart(userId)
  const key = lineKey({ _id: productId, color, size })
  const index = cart.items.findIndex((item) => lineKey(item) === key)
  if (index < 0) {
    throw new Error('Item not found in cart')
  }

  const parsedQty = Number(qty)
  if (!parsedQty || parsedQty <= 0) {
    cart.items.splice(index, 1)
    await cart.save()
    return getCart(userId)
  }

  const product = await Product.findById(productId)
  if (!product) {
    cart.items.splice(index, 1)
    await cart.save()
    throw new Error('Product no longer exists and was removed from cart')
  }

  const qtyLeft = product.totalQty - product.totalSold
  if (qtyLeft <= 0) {
    cart.items.splice(index, 1)
    await cart.save()
    throw new Error('Product is out of stock and was removed from cart')
  }

  const finalQty = Math.min(parsedQty, qtyLeft)
  cart.items[index].qty = finalQty
  cart.items[index].price = product.price
  cart.items[index].totalPrice = product.price * finalQty
  await cart.save()
  return getCart(userId)
}

export async function removeItem(userId, { productId, color, size }) {
  const cart = await findOrCreateCart(userId)
  const key = lineKey({ _id: productId, color, size })
  cart.items = cart.items.filter((item) => lineKey(item) !== key)
  await cart.save()
  return getCart(userId)
}

export async function applyCoupon(userId, code) {
  const normalized = normalizeCouponCode(code)
  if (!normalized) {
    throw new Error('Coupon code is required')
  }
  await resolveCouponDiscount(normalized)

  const cart = await findOrCreateCart(userId)
  if (!cart.items.length) {
    throw new Error('Cart is empty — add items before applying a coupon')
  }
  cart.couponCode = normalized
  await cart.save()
  return getCart(userId)
}

export async function removeCoupon(userId) {
  const cart = await findOrCreateCart(userId)
  cart.couponCode = null
  await cart.save()
  return getCart(userId)
}

export async function clearCart(userId) {
  const cart = await findOrCreateCart(userId)
  cart.items = []
  cart.couponCode = null
  await cart.save()
  return formatCartPayload(cart)
}

export async function syncLocalItems(userId, items) {
  if (!Array.isArray(items) || items.length === 0) {
    return getCart(userId)
  }

  const cart = await findOrCreateCart(userId)

  for (const item of items) {
    if (!item?._id || !item?.color || !item?.size) continue
    try {
      const product = await Product.findById(item._id)
      if (!product) continue

      const matchedColor = resolveOptionMatch(item.color, product.colors)
      const matchedSize = resolveOptionMatch(item.size, product.sizes)
      if (!matchedColor || !matchedSize) continue

      const qtyLeft = product.totalQty - product.totalSold
      if (qtyLeft <= 0) continue

      const finalQty = Math.min(Math.max(1, Number(item.qty) || 1), qtyLeft)
      const newLine = {
        _id: product._id,
        name: product.name,
        qty: finalQty,
        price: product.price,
        totalPrice: product.price * finalQty,
        color: matchedColor,
        size: matchedSize,
        description: product.description || '',
        image: product.images?.[0] || '',
      }

      const key = lineKey(newLine)
      const existingIndex = cart.items.findIndex((line) => lineKey(line) === key)
      if (existingIndex >= 0) {
        cart.items[existingIndex].qty = finalQty
        cart.items[existingIndex].price = product.price
        cart.items[existingIndex].totalPrice = product.price * finalQty
      } else {
        cart.items.push(newLine)
      }
    } catch {
      // skip invalid or unavailable items during sync
    }
  }

  await cart.save()
  return getCart(userId)
}

export async function getCartOrderItems(userId) {
  const cart = await findOrCreateCart(userId)
  if (!cart.items.length) {
    throw new Error('Cart is empty')
  }
  return {
    cart,
    orderItems: cart.items.map((item) => ({
      _id: item._id,
      name: item.name,
      qty: item.qty,
      price: item.price,
      totalPrice: item.totalPrice,
      color: item.color,
      size: item.size,
      description: item.description,
      image: item.image,
    })),
    couponCode: cart.couponCode,
  }
}

export async function validateCartStock(userId) {
  const cart = await findOrCreateCart(userId)
  const productIds = [...new Set(cart.items.map((i) => productIdKey(i._id)))]
  const products = await Product.find({ _id: { $in: productIds } })
  const productMap = {}
  products.forEach((p) => {
    productMap[productIdKey(p._id)] = p
  })

  const warnings = []
  const validItems = []

  for (const item of cart.items) {
    const product = productMap[productIdKey(item._id)]
    if (!product) {
      warnings.push({
        _id: String(item._id),
        color: item.color,
        size: item.size,
        name: item.name,
        reason: 'Product no longer exists',
      })
      continue
    }
    const qtyLeft = product.totalQty - product.totalSold
    if (qtyLeft <= 0) {
      warnings.push({
        _id: String(item._id),
        color: item.color,
        size: item.size,
        name: item.name,
        reason: 'Out of stock',
      })
      continue
    }
    const plainItem =
      typeof item.toObject === 'function' ? item.toObject() : { ...item }

    if (item.qty > qtyLeft) {
      warnings.push({
        _id: String(item._id),
        color: item.color,
        size: item.size,
        name: item.name,
        reason: `Only ${qtyLeft} left in stock`,
      })
      validItems.push({
        ...plainItem,
        qty: qtyLeft,
        price: product.price,
        totalPrice: product.price * qtyLeft,
      })
    } else {
      validItems.push({
        ...plainItem,
        price: product.price,
        totalPrice: product.price * item.qty,
      })
    }
  }

  cart.items = validItems
  await cart.save()
  const summary = await getCart(userId)
  return { ...summary, warnings }
}
