import Order from '../model/Order.js'
import { getStripeClient } from '../config/stripeClient.js'
import Product from '../model/Product.js'
import User, { USER_STRIPE_CHECKOUT_SELECT } from '../model/User.js'
import {
  isCouponExpired,
  isCouponLive,
  isCouponNotStarted,
} from '../utils/couponDates.js'
import { findLiveCouponByCode } from '../utils/couponQueries.js'
import { productIdKey, resolveOptionMatch } from './cartService.js'
import { resolveSizeForProduct } from './cartVariantMatch.js'
import { enrichNewOrderItem } from './orderLineItems.js'
import { CHECKOUT_LINK_TTL_MS } from './orderPaymentPollService.js'
import { enqueueCheckoutExpiry } from './checkoutQueue.js'
import config from '../config/env.js'
import { atomicallyReserveStockForOrderItems, releaseStock } from './stockService.js'
import { AppError } from '../utils/appError.js'

export async function resolveOrderCoupon(couponCode) {
  if (!couponCode) {
    return { couponFound: null, discountRate: 0 }
  }

  const couponFound = await findLiveCouponByCode(couponCode)
  if (!couponFound) {
    throw new Error('Coupon does not exist or is not valid')
  }
  if (isCouponNotStarted(couponFound)) {
    throw new Error('This coupon is not active yet')
  }
  if (isCouponExpired(couponFound)) {
    throw new Error('This coupon has expired')
  }
  if (!isCouponLive(couponFound)) {
    throw new Error('This coupon is not valid')
  }

  return { couponFound, discountRate: couponFound.discount / 100 }
}

export async function validateAndPriceOrderItems(orderItems) {
  const orderProductIds = orderItems
    .map((item) => productIdKey(item._id))
    .filter(Boolean)
  const orderProducts = await Product.find({ _id: { $in: orderProductIds } })
  const orderProductMap = {}
  orderProducts.forEach((p) => {
    orderProductMap[productIdKey(p._id)] = p
  })

  const validatedItems = []
  let recalculatedTotal = 0

  for (const item of orderItems) {
    const label = item?.name || 'Item'
    const product = orderProductMap[productIdKey(item._id)]
    if (!product) {
      throw new AppError(`${label} is no longer available`, 400)
    }

    const matchedColor = resolveOptionMatch(item.color, product.colors)
    if (!matchedColor) {
      throw new AppError(
        `${product.name}: color "${item.color}" is not available. Choose from: ${(product.colors || []).join(', ') || 'N/A'}`,
        400
      )
    }

    const matchedSize = resolveSizeForProduct(item.size, product)
    if (!matchedSize) {
      throw new AppError(
        `${product.name}: size "${item.size}" is not available. Choose from: ${(product.sizes || []).join(', ') || 'N/A'}`,
        400
      )
    }

    const qtyLeft = product.totalQty - product.totalSold
    if (qtyLeft <= 0) {
      throw new AppError(`${product.name} is out of stock`, 400)
    }

    const finalQty = Math.min(item.qty, qtyLeft)
    if (finalQty < item.qty) {
      throw new AppError(
        `Only ${qtyLeft} unit(s) of ${product.name} remain in stock`,
        400
      )
    }

    const trustedPrice = product.price
    validatedItems.push({
      ...item,
      color: matchedColor,
      size: matchedSize,
      price: trustedPrice,
      qty: finalQty,
      totalPrice: trustedPrice * finalQty,
    })
    recalculatedTotal += trustedPrice * finalQty
  }

  if (validatedItems.length <= 0) {
    throw new AppError('All items in your cart are unavailable or out of stock', 400)
  }

  if (validatedItems.length !== orderItems.length) {
    throw new AppError('Some cart items could not be included in checkout', 400)
  }

  return { validatedItems, recalculatedTotal }
}

async function releaseReservedCheckoutStock(orderItems = []) {
  for (const item of orderItems) {
    if (!item?._id) continue
    await releaseStock(item._id, item.qty)
  }
}

export async function createCheckoutSession({
  userId,
  orderItems,
  shippingAddress,
  couponCode,
  source = 'cart',
}) {
  const user = await User.findById(userId).select(USER_STRIPE_CHECKOUT_SELECT)
  if (!user) {
    throw new Error('User not found')
  }
  if (!shippingAddress) {
    throw new Error('Please provide shipping address')
  }
  if (!orderItems?.length) {
    throw new Error('No Order Items')
  }

  const { couponFound, discountRate } = await resolveOrderCoupon(couponCode)
  const { validatedItems, recalculatedTotal } =
    await validateAndPriceOrderItems(orderItems)
  await atomicallyReserveStockForOrderItems(validatedItems)

  const finalTotal =
    discountRate > 0
      ? Math.round(recalculatedTotal * (1 - discountRate) * 100) / 100
      : recalculatedTotal

  let order = null

  const convertedOrders = validatedItems.map((item) => {
    const discountedPrice =
      discountRate > 0
        ? Math.round(item.price * (1 - discountRate) * 100)
        : item.price * 100
    return {
      price_data: {
        currency: 'inr',
        product_data: {
          name: item?.name,
          description: item?.description,
        },
        unit_amount: discountedPrice,
      },
      quantity: item?.qty,
    }
  })

  const addr = shippingAddress || {}
  const stripeAddress = {
    line1: addr.address || 'N/A',
    city: addr.city || '',
    state: addr.province || '',
    postal_code: addr.postalCode || '',
    country: addr.country || 'IN',
  }

  try {
    order = await Order.create({
      user: user._id,
      orderItems: validatedItems.map(enrichNewOrderItem),
      shippingAddress,
      totalPrice: finalTotal,
      subtotalBeforeDiscount: recalculatedTotal,
      discountAmount:
        discountRate > 0 ? Math.round((recalculatedTotal - finalTotal) * 100) / 100 : 0,
      discountRate,
      stockReservedAtCheckout: true,
      stockReservationSettledAt: null,
      stockReservationReleasedAt: null,
      ...(couponFound && { coupon: couponFound.code }),
    })

    const stripe = getStripeClient()
    const stripeCustomer = await stripe.customers.create({
      name: user.fullname,
      email: user.email,
      address: stripeAddress,
      shipping: {
        name:
          `${addr.firstName || ''} ${addr.lastName || ''}`.trim() || user.fullname,
        phone: addr.phone || '',
        address: stripeAddress,
      },
    })

  const baseUrl = config.cors.origin
  const checkoutSource = source === 'chat' ? 'chat' : 'cart'
  const successUrl =
    checkoutSource === 'chat'
      ? `${baseUrl}/assistant?payment=success&session_id={CHECKOUT_SESSION_ID}`
      : `${baseUrl}/customer-profile?payment=success&session_id={CHECKOUT_SESSION_ID}`
  const cancelUrl =
    checkoutSource === 'chat'
      ? `${baseUrl}/assistant?payment=cancelled`
      : `${baseUrl}/shopping-cart?payment=cancelled`

    const session = await stripe.checkout.sessions.create({
      line_items: convertedOrders,
      customer: stripeCustomer.id,
      metadata: {
        orderId: order._id.toString(),
        checkoutSource,
      },
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
    })

    order.stripeSessionId = session.id
    order.checkoutSource = checkoutSource
    order.checkoutExpiresAt = new Date(Date.now() + CHECKOUT_LINK_TTL_MS)
    await order.save()

    await enqueueCheckoutExpiry(order._id, CHECKOUT_LINK_TTL_MS)

    return {
      url: session.url,
      orderId: String(order._id),
      orderNumber: order.orderNumber,
      totalPrice: finalTotal,
      checkoutSource,
      expiresAt: order.checkoutExpiresAt,
    }
  } catch (err) {
    await releaseReservedCheckoutStock(validatedItems)
    if (order?._id) {
      await Order.findByIdAndDelete(order._id).catch(() => {})
    }
    throw err
  }
}
