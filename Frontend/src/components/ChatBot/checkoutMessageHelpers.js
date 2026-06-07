export function patchCheckoutByOrderId(messages, orderId, patch) {
  if (!orderId) return messages
  const id = String(orderId)
  return messages.map((m) =>
    m.checkout?.orderId === id
      ? { ...m, checkout: { ...m.checkout, ...patch } }
      : m
  )
}

export function checkoutCardVisible(checkout) {
  if (!checkout?.orderId) return false
  return Boolean(
    checkout.checkoutUrl || checkout.paid || checkout.expired
  )
}

function formatInr(price) {
  if (price == null || Number.isNaN(Number(price))) return '₹0'
  return `₹${Number(price).toLocaleString('en-IN')}`
}

function formatItemLine(item) {
  const variant = [item.size, item.color].filter(Boolean).join(', ')
  const label = variant ? `${item.name} (${variant})` : item.name
  return `• **${item.qty || 1} × ${label}**`
}

function formatPaymentStatusLabel(paymentStatus) {
  if (!paymentStatus) return null
  if (paymentStatus === 'paid') return 'Paid'
  if (paymentStatus === 'Not paid') return 'Not paid'
  return paymentStatus
}

export function normalizePaymentConfirmData(data) {
  if (!data) return {}

  if (data.order) {
    const order = data.order
    return {
      orderId: String(order._id || order.id || ''),
      orderNumber: order.orderNumber,
      totalPrice: order.totalPrice,
      paymentStatus: order.paymentStatus,
      items: (order.orderItems || []).map((item) => ({
        name: item.name || 'Item',
        qty: item.qty || 1,
        size: item.size,
        color: item.color,
      })),
      confirmationEmailSent: data.confirmationEmailSent === true,
      emailTo: data.emailTo || null,
    }
  }

  return {
    orderId: data.orderId ? String(data.orderId) : '',
    orderNumber: data.orderNumber,
    totalPrice: data.totalPrice,
    paymentStatus: data.paymentStatus,
    items: data.items || [],
    confirmationEmailSent: data.confirmationEmailSent === true,
    emailTo: data.emailTo || null,
  }
}

export function buildPaymentConfirmedReply(data) {
  const orderNumber = data.orderNumber || 'your order'
  const lines = [
    `Great news — your payment for order **#${orderNumber}** is confirmed!`,
    '',
    '**Order summary**',
  ]

  const items = data.items || []
  if (items.length) {
    lines.push(...items.map(formatItemLine))
  } else {
    lines.push('• Your items are being prepared for dispatch.')
  }

  lines.push('')
  if (data.totalPrice != null) {
    lines.push(`**Total paid:** ${formatInr(data.totalPrice)}`)
  }
  const paymentLabel = formatPaymentStatusLabel(data.paymentStatus)
  if (paymentLabel) {
    lines.push(`**Payment status:** ${paymentLabel}`)
  }

  lines.push('')
  if (data.confirmationEmailSent) {
    const emailPart = data.emailTo ? ` to **${data.emailTo}**` : ''
    lines.push(
      `We've sent a confirmation email${emailPart} with your order details. You'll get tracking info when your order ships.`
    )
  } else {
    lines.push(
      "Your payment is confirmed. We couldn't verify that the confirmation email was sent — check your inbox and spam folder, or view the order in [My Profile](/customer-profile)."
    )
  }

  lines.push('')
  lines.push('View your orders anytime in [My Profile](/customer-profile).')

  return lines.join('\n')
}
