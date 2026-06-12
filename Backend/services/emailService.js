import { Resend } from 'resend'
import config from '../config/env.js'
import logger from '../utils/logger.js'

/** Read at send time so config reflects env loaded after module init order. */
function getFromAddress() {
  return config.email.from || 'ShopAI <onboarding@resend.dev>'
}

function normalizeEmail(to) {
  return String(to || '')
    .trim()
    .toLowerCase()
}

function parseFromAddress(from) {
  const raw = String(from || getFromAddress()).trim()
  const bracketMatch = raw.match(/^(.+?)\s*<([^>]+)>$/)
  if (bracketMatch) {
    return { name: bracketMatch[1].trim(), email: bracketMatch[2].trim() }
  }
  return { name: 'ShopAI', email: raw }
}

function orderProviders() {
  const pref = (config.email.provider || '').toLowerCase()
  const resend = {
    name: 'Resend',
    key: () => config.email.resendApiKey,
    send: async ({ to, subject, html, text, from }) => {
      const resendClient = new Resend(config.email.resendApiKey)
      const { error } = await resendClient.emails.send({
        from,
        to,
        subject,
        html,
        text: text || undefined,
      })
      if (error) throw new Error(error.message)
    },
  }
  const brevo = {
    name: 'Brevo',
    key: () => config.email.brevoApiKey,
    send: async ({ to, subject, html, text, from, tags }) => {
      const sender = parseFromAddress(from)
      if (sender.email.includes('resend.dev')) {
        logger.warn(
          'Brevo: EMAIL_FROM uses resend.dev — set EMAIL_FROM to your Brevo-verified sender (e.g. you@yourdomain.com)'
        )
      }

      const payload = {
        sender,
        to: [{ email: to }],
        subject,
        htmlContent: html,
        textContent: text || stripHtmlToText(html),
      }
      if (tags?.length) payload.tags = tags

      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': config.email.brevoApiKey,
        },
        body: JSON.stringify(payload),
      })

      const bodyText = await response.text()
      let body = {}
      try {
        body = bodyText ? JSON.parse(bodyText) : {}
      } catch {
        body = { raw: bodyText }
      }

      if (!response.ok) {
        throw new Error(`Brevo error (${response.status}): ${bodyText || 'Unknown error'}`)
      }

      return { messageId: body.messageId }
    },
  }

  const hasBrevo = !!config.email.brevoApiKey
  const hasResend = !!config.email.resendApiKey

  if (pref === 'brevo' || (hasBrevo && !hasResend)) return [brevo, resend]
  if (pref === 'resend' || (hasResend && !hasBrevo)) return [resend, brevo]
  // Both keys set: default to Brevo first (common when Resend is leftover in .env)
  return [brevo, resend]
}

function stripHtmlToText(html) {
  return String(html || '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function sendEmail({ to, subject, html, text, tags }) {
  const from = getFromAddress()
  const recipient = normalizeEmail(to)
  if (!recipient) {
    return { success: false, error: 'Missing recipient email' }
  }

  let lastError = null

  for (const provider of orderProviders()) {
    try {
      if (!provider.key()) continue
      const extra = await provider.send({
        to: recipient,
        subject,
        html,
        text,
        from,
        tags,
      })
      logger.log(`Email sent via ${provider.name} to ${recipient}`, extra?.messageId || '')
      return {
        success: true,
        provider: provider.name,
        messageId: extra?.messageId,
        to: recipient,
      }
    } catch (err) {
      lastError = err
      logger.error(`${provider.name} failed for ${recipient}:`, err.message)
    }
  }

  logger.error('All email providers failed:', lastError?.message)
  return { success: false, error: lastError?.message, to: recipient }
}

// --- Template Helpers ---

const baseStyle = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  max-width: 600px;
  margin: 0 auto;
  padding: 40px 20px;
  color: #1f2937;
`

const buttonStyle = `
  display: inline-block;
  background: #4f46e5;
  color: #ffffff;
  padding: 12px 24px;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 600;
`

function wrap(content) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;">
  <div style="${baseStyle}">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="color:#4f46e5;font-size:28px;margin:0;">ShopAI</h1>
    </div>
    <div style="background:#ffffff;border-radius:8px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
      ${content}
    </div>
    <p style="text-align:center;color:#6b7280;font-size:12px;margin-top:32px;">
      &copy; ${new Date().getFullYear()} ShopAI. All rights reserved.
    </p>
  </div>
</body>
</html>`
}

export function sendWelcomeEmail(to, name) {
  return sendEmail({
    to,
    subject: 'Welcome to ShopAI!',
    html: wrap(`
      <h2 style="color:#1f2937;margin-top:0;">Welcome, ${name}!</h2>
      <p style="color:#4b5563;line-height:1.6;">
        We're thrilled to have you on board. ShopAI brings you a smarter shopping experience
        powered by AI — personalized recommendations, instant support, and seamless checkout.
      </p>
      <p style="color:#4b5563;line-height:1.6;">Start exploring and find something you'll love.</p>
      <div style="text-align:center;margin-top:24px;">
        <a href="${config.cors.origin}" style="${buttonStyle}">Start Shopping</a>
      </div>
    `),
  })
}

export function sendPasswordResetOTPEmail(to, name, otp) {
  return sendEmail({
    to,
    subject: 'Your ShopAI Password Reset OTP',
    html: wrap(`
      <h2 style="color:#1f2937;margin-top:0;">Password Reset</h2>
      <p style="color:#4b5563;line-height:1.6;">
        Hi ${name}, we received a request to reset your password. Use the OTP below to proceed:
      </p>
      <div style="text-align:center;margin:24px 0;">
        <div style="display:inline-block;background:#f3f4f6;border:2px dashed #4f46e5;border-radius:10px;padding:16px 40px;">
          <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#4f46e5;font-family:monospace;">${otp}</span>
        </div>
      </div>
      <p style="color:#6b7280;font-size:13px;line-height:1.5;">
        This OTP is valid for <strong>10 minutes</strong>. If you didn't request this, you can safely ignore this email.
      </p>
    `),
    text: `Hi ${name},\n\nYour ShopAI password reset OTP is: ${otp}\n\nValid for 10 minutes.`,
  })
}

function formatInr(amount) {
  const value = Number(amount || 0)
  return `Rs. ${value.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatOrderDate(date) {
  try {
    return new Date(date).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return new Date().toLocaleString('en-IN')
  }
}

function buildLineItemsRows(orderItems) {
  return orderItems
    .map((item) => {
      const qty = Number(item.qty) || 1
      const lineTotal = Number(item.totalPrice) || Number(item.price) * qty || 0
      const variant = [item.color, item.size ? `Size ${item.size}` : null]
        .filter(Boolean)
        .join(' · ')
      const variantHtml = variant
        ? `<br><span style="color:#6b7280;font-size:13px;">${escapeHtml(variant)}</span>`
        : ''

      return `
        <tr>
          <td style="padding:12px 8px;border-bottom:1px solid #e5e7eb;color:#111827;">
            <strong>${escapeHtml(item.name)}</strong>${variantHtml}
          </td>
          <td style="padding:12px 8px;border-bottom:1px solid #e5e7eb;text-align:center;color:#374151;">${qty}</td>
          <td style="padding:12px 8px;border-bottom:1px solid #e5e7eb;text-align:right;color:#111827;font-weight:600;">${formatInr(lineTotal)}</td>
        </tr>`
    })
    .join('')
}

function buildShippingBlock(address) {
  if (!address) return '<p style="color:#6b7280;margin:0;">Shipping address on file</p>'
  const name = [address.firstName, address.lastName].filter(Boolean).join(' ')
  const lines = [
    name,
    address.address,
    [address.city, address.province, address.postalCode].filter(Boolean).join(', '),
    address.country,
    address.phone ? `Phone: ${address.phone}` : null,
  ].filter(Boolean)

  return lines
    .map((line) => `<p style="margin:0 0 4px;color:#374151;">${escapeHtml(line)}</p>`)
    .join('')
}

function buildOrderConfirmationText(name, order) {
  const orderItems = order?.orderItems || []
  const itemsSubtotal = orderItems.reduce(
    (sum, item) => sum + (Number(item.totalPrice) || Number(item.price) * (Number(item.qty) || 1) || 0),
    0
  )
  const orderTotal = Number(order.totalPrice) || 0
  const discount = Math.max(0, itemsSubtotal - orderTotal)
  const orderNumber = order.orderNumber || order._id
  const profileUrl = `${config.cors.origin}/customer-profile`

  const lines = orderItems.map((item) => {
    const qty = Number(item.qty) || 1
    const lineTotal = Number(item.totalPrice) || Number(item.price) * qty || 0
    const variant = [item.color, item.size ? `Size ${item.size}` : null].filter(Boolean).join(', ')
    return `- ${item.name}${variant ? ` (${variant})` : ''} x ${qty} = ${formatInr(lineTotal)}`
  })

  const address = order.shippingAddress
  const shipName = [address?.firstName, address?.lastName].filter(Boolean).join(' ')
  const shipLines = address
    ? [
        shipName,
        address.address,
        [address.city, address.province, address.postalCode].filter(Boolean).join(', '),
        address.country,
        address.phone,
      ]
        .filter(Boolean)
        .join('\n')
    : 'On file'

  return [
    `Hi ${name},`,
    '',
    `Thanks for your order at ShopAI! Order #${orderNumber} is confirmed.`,
    '',
    'ORDER SUMMARY',
    '-------------',
    ...lines,
    '',
    `Subtotal: ${formatInr(itemsSubtotal)}`,
    discount > 0.01 ? `Discount: -${formatInr(discount)}` : null,
    `Order total: ${formatInr(orderTotal)}`,
    '',
    'SHIPPING TO',
    '-------------',
    shipLines,
    '',
    `View your order: ${profileUrl}`,
    '',
    'You will receive another email when your order ships.',
  ]
    .filter(Boolean)
    .join('\n')
}

/**
 * Order confirmation email — line items, totals, shipping (Amazon / Flipkart style).
 */
export function sendOrderConfirmationEmail(to, name, order) {
  const orderItems = order?.orderItems || []
  const itemsSubtotal = orderItems.reduce(
    (sum, item) => sum + (Number(item.totalPrice) || Number(item.price) * (Number(item.qty) || 1) || 0),
    0
  )
  const orderTotal = Number(order.totalPrice) || 0
  const discount = Math.max(0, itemsSubtotal - orderTotal)
  const orderNumber = order.orderNumber || order._id
  const orderDate = formatOrderDate(order.createdAt)
  const profileUrl = `${config.cors.origin}/customer-profile`
  const paymentLabel =
    order.paymentMethod && order.paymentMethod !== 'Not specified'
      ? order.paymentMethod.charAt(0).toUpperCase() + order.paymentMethod.slice(1)
      : 'Online payment'

  const discountRow =
    discount > 0.01
      ? `<tr>
          <td colspan="2" style="padding:8px 8px 4px;text-align:right;color:#059669;">Discount${order.coupon ? ` (${escapeHtml(order.coupon)})` : ''}</td>
          <td style="padding:8px 8px 4px;text-align:right;color:#059669;font-weight:600;">-${formatInr(discount)}</td>
        </tr>`
      : ''

  const safeName = escapeHtml(name)
  const subject = `Your ShopAI order #${orderNumber} is confirmed`
  const text = buildOrderConfirmationText(name, order)

  return sendEmail({
    to,
    subject,
    text,
    tags: ['order-confirmation'],
    html: wrap(`
      <h2 style="color:#1f2937;margin-top:0;font-size:22px;">Thanks for your order, ${safeName}!</h2>
      <p style="color:#4b5563;line-height:1.6;margin:8px 0 20px;">
        We've received your payment and started processing your order. You'll get another email when it ships.
      </p>

      <div style="background:#f9fafb;border-radius:8px;padding:16px 18px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="color:#6b7280;font-size:13px;padding-bottom:4px;">Order number</td>
            <td style="text-align:right;font-weight:700;color:#4f46e5;padding-bottom:4px;">#${escapeHtml(orderNumber)}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;font-size:13px;">Order placed</td>
            <td style="text-align:right;color:#374151;">${escapeHtml(orderDate)}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;font-size:13px;">Payment</td>
            <td style="text-align:right;color:#374151;">${escapeHtml(paymentLabel)} - Paid</td>
          </tr>
        </table>
      </div>

      <h3 style="color:#111827;font-size:16px;margin:0 0 12px;">Order summary</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
        <thead>
          <tr>
            <th style="text-align:left;padding:8px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;border-bottom:2px solid #e5e7eb;">Item</th>
            <th style="text-align:center;padding:8px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;border-bottom:2px solid #e5e7eb;">Qty</th>
            <th style="text-align:right;padding:8px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;border-bottom:2px solid #e5e7eb;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${buildLineItemsRows(orderItems)}
          <tr>
            <td colspan="2" style="padding:14px 8px 4px;text-align:right;color:#6b7280;">Subtotal</td>
            <td style="padding:14px 8px 4px;text-align:right;color:#374151;">${formatInr(itemsSubtotal)}</td>
          </tr>
          ${discountRow}
          <tr>
            <td colspan="2" style="padding:10px 8px 0;text-align:right;font-weight:700;color:#111827;font-size:16px;">Order total</td>
            <td style="padding:10px 8px 0;text-align:right;font-weight:700;color:#4f46e5;font-size:16px;">${formatInr(orderTotal)}</td>
          </tr>
        </tbody>
      </table>

      <h3 style="color:#111827;font-size:16px;margin:28px 0 10px;">Shipping to</h3>
      <div style="background:#f9fafb;border-radius:8px;padding:14px 16px;margin-bottom:28px;">
        ${buildShippingBlock(order.shippingAddress)}
      </div>

      <div style="text-align:center;margin:28px 0 8px;">
        <a href="${profileUrl}" style="${buttonStyle}">View order in your account</a>
      </div>

      <p style="color:#6b7280;font-size:13px;line-height:1.5;margin-top:24px;text-align:center;">
        Questions about your order? Reply to this email or visit your account for order status updates.
      </p>
    `),
  })
}

export function sendOrderStatusEmail(to, name, orderNumber, status) {
  return sendEmail({
    to,
    subject: `Order #${orderNumber} - ${status}`,
    html: wrap(`
      <h2 style="color:#1f2937;margin-top:0;">Order Update</h2>
      <p style="color:#4b5563;line-height:1.6;">
        Hi ${name}, your order <strong>#${orderNumber}</strong> status has been updated:
      </p>
      <div style="text-align:center;margin:24px 0;">
        <span style="display:inline-block;background:#eef2ff;color:#4f46e5;padding:10px 20px;border-radius:20px;font-weight:600;font-size:16px;">
          ${status}
        </span>
      </div>
      <p style="color:#4b5563;line-height:1.6;">
        Check your account for full tracking details.
      </p>
    `),
  })
}

export function sendReviewFlaggedEmail(to, name, reason) {
  return sendEmail({
    to,
    subject: 'Your ShopAI Review Has Been Flagged',
    html: wrap(`
      <h2 style="color:#1f2937;margin-top:0;">Review Flagged</h2>
      <p style="color:#4b5563;line-height:1.6;">
        Hi ${name}, one of your recent reviews has been flagged by our moderation system.
      </p>
      <div style="background:#fef2f2;border-left:4px solid #ef4444;border-radius:4px;padding:12px 16px;margin:20px 0;">
        <p style="margin:0;color:#991b1b;font-weight:500;">Reason: ${reason}</p>
      </div>
      <p style="color:#4b5563;line-height:1.6;">
        If you believe this was a mistake, please contact our support team. Otherwise, consider
        editing your review to meet our community guidelines.
      </p>
    `),
  })
}
