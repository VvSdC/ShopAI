import dotenv from 'dotenv'
dotenv.config()
import Stripe from 'stripe'
import Order from '../model/Order.js'
import Product from '../model/Product.js'
import User from '../model/User.js'
import {
  isCouponExpired,
  isCouponLive,
  isCouponNotStarted,
} from '../utils/couponDates.js'
import { findLiveCouponByCode } from '../utils/couponQueries.js'
import { productIdKey } from './cartService.js'
import { enrichNewOrderItem } from './orderLineItems.js'

const stripe = new Stripe(process.env.STRIPE_KEY)

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
    const product = orderProductMap[productIdKey(item._id)]
    if (!product) continue
    const qtyLeft = product.totalQty - product.totalSold
    if (qtyLeft <= 0) continue
    const finalQty = Math.min(item.qty, qtyLeft)
    const trustedPrice = product.price
    validatedItems.push({
      ...item,
      price: trustedPrice,
      qty: finalQty,
      totalPrice: trustedPrice * finalQty,
    })
    recalculatedTotal += trustedPrice * finalQty
  }

  if (validatedItems.length <= 0) {
    throw new Error('All items in your cart are unavailable or out of stock')
  }

  return { validatedItems, recalculatedTotal }
}

export async function createCheckoutSession({
  userId,
  orderItems,
  shippingAddress,
  couponCode,
}) {
  const user = await User.findById(userId)
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

  const finalTotal =
    discountRate > 0
      ? Math.round(recalculatedTotal * (1 - discountRate) * 100) / 100
      : recalculatedTotal

  const order = await Order.create({
    user: user._id,
    orderItems: validatedItems.map(enrichNewOrderItem),
    shippingAddress,
    totalPrice: finalTotal,
    subtotalBeforeDiscount: recalculatedTotal,
    discountAmount:
      discountRate > 0 ? Math.round((recalculatedTotal - finalTotal) * 100) / 100 : 0,
    discountRate,
    ...(couponFound && { coupon: couponFound.code }),
  })

  user.orders.push(order._id)
  await user.save()

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

  const session = await stripe.checkout.sessions.create({
    line_items: convertedOrders,
    customer: stripeCustomer.id,
    metadata: {
      orderId: order._id.toString(),
    },
    mode: 'payment',
    success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/cancel`,
  })

  order.stripeSessionId = session.id
  await order.save()

  return {
    url: session.url,
    orderId: String(order._id),
    orderNumber: order.orderNumber,
    totalPrice: finalTotal,
  }
}
