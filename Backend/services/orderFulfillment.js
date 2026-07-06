import logger from '../utils/logger.js'
import Order from '../model/Order.js'
import User from '../model/User.js'
import { sendOrderConfirmationEmail, sendOrderStockUnavailableRefundEmail } from './emailService.js'
import { atomicallyReserveStockForOrderItems } from './stockService.js'
import { clearCart } from './cartService.js'
import { normalizeOrderItems } from './orderLineItems.js'
import { createStripeRefund } from './orderRefund.js'
import { STORE_POLICY } from '../config/storePolicy.js'

const MAX_CONFIRMATION_EMAIL_ATTEMPTS = 5

function parseOrderId(raw) {
  return String(raw || '').replace(/"/g, '').trim()
}

async function getCustomerForOrder(order) {
  const userId = order?.user?._id || order?.user
  if (!userId) return null
  return User.findById(userId).select('fullname email')
}

function resolveRecipientEmail(customer, receiptEmail) {
  const fromUser = customer?.email?.toLowerCase()?.trim()
  const fromStripe = receiptEmail?.toLowerCase()?.trim()
  return fromUser || fromStripe || null
}

/**
 * Send order confirmation email (no stock changes). Safe to call multiple times;
 * only marks confirmationEmailSent when the provider accepts the send.
 */
export async function sendOrderConfirmation(order, options = {}) {
  const { receiptEmail, force = false } = options
  const customer = await getCustomerForOrder(order)
  const email = resolveRecipientEmail(customer, receiptEmail)

  if (!email) {
    logger.error(
      'Order confirmation email skipped — no email for order',
      order.orderNumber,
      'userId=',
      order?.user
    )
    return { success: false, error: 'No customer email on file' }
  }

  if (order.confirmationEmailSent && !force) {
    return {
      success: true,
      skipped: true,
      alreadySent: true,
      to: email,
    }
  }

  if (order.confirmationEmailAttempts >= MAX_CONFIRMATION_EMAIL_ATTEMPTS) {
    return {
      success: false,
      error: 'Maximum confirmation email attempts reached for this order',
      to: email,
    }
  }

  logger.log(`Sending order confirmation #${order.orderNumber} to ${email}`)
  const emailResult = await sendOrderConfirmationEmail(
    email,
    customer?.fullname || 'Customer',
    order
  )

  const update = {
    $inc: { confirmationEmailAttempts: 1 },
    lastConfirmationEmailAt: new Date(),
  }

  if (emailResult?.success) {
    update.confirmationEmailSent = true
    logger.log(
      `Order confirmation sent #${order.orderNumber} via ${emailResult.provider}`,
      emailResult.messageId ? `(id: ${emailResult.messageId})` : ''
    )
  } else {
    logger.error(
      `Order confirmation failed #${order.orderNumber} to ${email}:`,
      emailResult?.error
    )
  }

  await Order.findByIdAndUpdate(order._id, update)

  return { ...emailResult, to: email }
}

async function adjustStockForOrder(orderItems) {
  await atomicallyReserveStockForOrderItems(orderItems)
}

async function resolveInsufficientStockAfterPayment(order, { receiptEmail, stockError } = {}) {
  const fresh = await Order.findById(order._id)
  if (!fresh) {
    return { resolved: false, reason: 'order_not_found' }
  }

  if (fresh.status === 'cancelled' && fresh.refundStatus === 'full') {
    return {
      resolved: true,
      alreadyResolved: true,
      refundAmount: fresh.totalRefunded || 0,
      emailSent: false,
    }
  }

  const refundAmount =
    Math.round(((fresh.totalPrice || 0) - (fresh.totalRefunded || 0)) * 100) / 100

  let stripeRefundId = null
  let refundError = null

  if (fresh.paymentStatus === 'paid' && refundAmount > 0.01) {
    try {
      const refund = await createStripeRefund(fresh, refundAmount)
      stripeRefundId = refund.id
    } catch (err) {
      refundError = err.message
      logger.error(
        `[fulfillment] auto-refund failed for order ${fresh.orderNumber}:`,
        err.message
      )
    }
  }

  const cancelledItems = normalizeOrderItems(fresh.orderItems).map((item) => ({
    ...item,
    lineStatus: 'cancelled',
    cancelledQty: item.qty,
  }))

  const refundedNow = stripeRefundId ? refundAmount : 0
  const totalRefunded = (fresh.totalRefunded || 0) + refundedNow
  const update = {
    postPaymentProcessed: false,
    status: 'cancelled',
    orderItems: cancelledItems,
    totalRefunded,
    refundStatus: fresh.refundStatus,
  }

  if (stripeRefundId) {
    update.stripeRefundIds = [...(fresh.stripeRefundIds || []), stripeRefundId]
    update.refundStatus =
      totalRefunded >= (fresh.totalPrice || 0) - 0.01 ? 'full' : 'partial'
  }

  await Order.findByIdAndUpdate(fresh._id, update)

  const customer = await getCustomerForOrder(fresh)
  const email = resolveRecipientEmail(customer, receiptEmail)
  let emailResult = { success: false, error: 'No customer email on file' }

  if (email) {
    const orderForEmail = {
      ...(fresh.toObject?.() || fresh),
      ...update,
      orderItems: cancelledItems,
    }
    emailResult = await sendOrderStockUnavailableRefundEmail(
      email,
      customer?.fullname || 'Customer',
      orderForEmail,
      {
        refundAmount: refundedNow,
        refundTimeline: STORE_POLICY.cancellation.refundTimelineDays,
      }
    )
    if (!emailResult?.success) {
      logger.error(
        `[fulfillment] stock-unavailable email failed for order ${fresh.orderNumber}:`,
        emailResult?.error
      )
    }
  } else {
    logger.error(
      `[fulfillment] stock-unavailable email skipped — no email for order ${fresh.orderNumber}`
    )
  }

  return {
    resolved: true,
    refundAmount: refundedNow,
    stripeRefundId,
    refundError,
    emailSent: emailResult?.success === true,
    emailError: emailResult?.error,
    emailTo: email,
    stockError: stockError?.message,
  }
}

/**
 * Run once per paid order: adjust inventory and send confirmation email.
 * Safe to call from webhook and verify-payment (idempotent).
 */
export async function processPaidOrder(orderId, options = {}) {
  const id = parseOrderId(orderId)
  const { receiptEmail } = options

  const claimed = await Order.findOneAndUpdate(
    {
      _id: id,
      paymentStatus: 'paid',
      status: { $ne: 'cancelled' },
      postPaymentProcessed: { $ne: true },
    },
    { postPaymentProcessed: true },
    { new: true }
  )

  if (!claimed) {
    const existing = await Order.findById(id)
    if (existing?.paymentStatus !== 'paid') {
      return {
        processed: false,
        emailSent: false,
        reason: 'payment_not_paid',
      }
    }

    const emailResult = await sendOrderConfirmation(existing, { receiptEmail })
    return {
      processed: false,
      alreadyProcessed: existing?.postPaymentProcessed === true,
      emailSent: emailResult?.success === true,
      emailSkipped: emailResult?.skipped === true,
      emailError: emailResult?.error,
      emailTo: emailResult?.to,
    }
  }

  const orderItems = claimed.orderItems || []
  let holdSettled = false
  if (
    claimed.stockReservedAtCheckout &&
    !claimed.stockReservationReleasedAt &&
    !claimed.stockReservationSettledAt
  ) {
    claimed.stockReservationSettledAt = new Date()
    holdSettled = true
  } else if (orderItems.length > 0) {
    try {
      await adjustStockForOrder(orderItems)
    } catch (err) {
      await Order.findByIdAndUpdate(id, { postPaymentProcessed: false })
      logger.error(
        `[fulfillment] stock reservation failed for order ${claimed.orderNumber}:`,
        err.message
      )

      const resolution = await resolveInsufficientStockAfterPayment(claimed, {
        receiptEmail,
        stockError: err,
      })

      return {
        processed: false,
        emailSent: false,
        reason: 'insufficient_stock',
        error: err.message,
        refundIssued: Boolean(resolution.stripeRefundId),
        refundAmount: resolution.refundAmount || 0,
        refundError: resolution.refundError || null,
        customerNotified: resolution.emailSent === true,
        customerEmail: resolution.emailTo || null,
        alreadyResolved: resolution.alreadyResolved === true,
      }
    }
  }

  if (claimed.user) {
    try {
      await clearCart(claimed.user)
    } catch (err) {
      logger.warn(
        `[fulfillment] clear cart failed for order ${claimed.orderNumber}:`,
        err.message
      )
    }
  }

  const emailResult = await sendOrderConfirmation(claimed, { receiptEmail })
  if (holdSettled) {
    await claimed.save()
  }

  return {
    processed: true,
    emailSent: emailResult?.success === true && !emailResult?.skipped,
    emailSkipped: emailResult?.skipped === true,
    emailError: emailResult?.error,
    emailTo: emailResult?.to,
  }
}

export async function resendOrderConfirmation(orderId, options = {}) {
  const id = parseOrderId(orderId)
  const order = await Order.findById(id)
  if (!order) {
    return { success: false, error: 'Order not found' }
  }
  if (order.paymentStatus !== 'paid') {
    return { success: false, error: 'Order is not paid' }
  }

  return sendOrderConfirmation(order, { ...options, force: true })
}

export { parseOrderId, MAX_CONFIRMATION_EMAIL_ATTEMPTS }
