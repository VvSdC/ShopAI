import Order from '../model/Order.js'
import User from '../model/User.js'
import { sendOrderConfirmationEmail } from './emailService.js'
import { atomicallyReserveStockForOrderItems } from './stockService.js'

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
    console.error(
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

  console.log(`Sending order confirmation #${order.orderNumber} to ${email}`)
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
    console.log(
      `Order confirmation sent #${order.orderNumber} via ${emailResult.provider}`,
      emailResult.messageId ? `(id: ${emailResult.messageId})` : ''
    )
  } else {
    console.error(
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
  if (orderItems.length > 0) {
    try {
      await adjustStockForOrder(orderItems)
    } catch (err) {
      await Order.findByIdAndUpdate(id, { postPaymentProcessed: false })
      console.error(
        `[fulfillment] stock reservation failed for order ${claimed.orderNumber}:`,
        err.message
      )
      return {
        processed: false,
        emailSent: false,
        reason: 'insufficient_stock',
        error: err.message,
      }
    }
  }

  const emailResult = await sendOrderConfirmation(claimed, { receiptEmail })

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
