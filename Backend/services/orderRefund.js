import dotenv from 'dotenv'
dotenv.config()
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_KEY)

export async function resolvePaymentIntentId(order) {
  if (order.stripePaymentIntentId) {
    return order.stripePaymentIntentId
  }
  if (order.stripeSessionId) {
    const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId)
    const pi = session.payment_intent
    return typeof pi === 'string' ? pi : pi?.id || null
  }
  return null
}

export async function createStripeRefund(order, amountInr) {
  if (order.paymentStatus !== 'paid') {
    throw new Error('Order is not paid — no refund required')
  }

  const paymentIntentId = await resolvePaymentIntentId(order)
  if (!paymentIntentId) {
    throw new Error(
      'Payment reference not found for this order. Contact support for a manual refund.'
    )
  }

  const remaining =
    Math.round(((order.totalPrice || 0) - (order.totalRefunded || 0)) * 100) / 100
  if (amountInr > remaining + 0.01) {
    throw new Error(`Refund amount exceeds remaining refundable balance (₹${remaining})`)
  }

  const amountPaise = Math.round(amountInr * 100)
  if (amountPaise <= 0) {
    throw new Error('Refund amount must be greater than zero')
  }

  const refund = await stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount: amountPaise,
  })

  return refund
}

export async function persistPaymentReferences(orderId, session) {
  const paymentIntent = session.payment_intent
  const paymentIntentId =
    typeof paymentIntent === 'string' ? paymentIntent : paymentIntent?.id || null

  return {
    stripeSessionId: session.id,
    stripePaymentIntentId: paymentIntentId,
  }
}
