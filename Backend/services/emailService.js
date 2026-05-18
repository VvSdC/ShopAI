import { Resend } from 'resend'

const FROM_DEFAULT = process.env.EMAIL_FROM || 'ShopAI <onboarding@resend.dev>'

const providers = [
  {
    name: 'Resend',
    key: () => process.env.RESEND_API_KEY,
    send: async ({ to, subject, html, from }) => {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const { error } = await resend.emails.send({ from, to, subject, html })
      if (error) throw new Error(error.message)
    },
  },
  {
    name: 'Brevo',
    key: () => process.env.BREVO_API_KEY,
    send: async ({ to, subject, html, from }) => {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': process.env.BREVO_API_KEY,
        },
        body: JSON.stringify({
          sender: { email: from.match(/<(.+)>/)?.[1] || from, name: from.match(/^(.+?)\s*</)?.[1] || 'ShopAI' },
          to: [{ email: to }],
          subject,
          htmlContent: html,
        }),
      })
      if (!response.ok) {
        const text = await response.text().catch(() => 'Unknown error')
        throw new Error(`Brevo error (${response.status}): ${text}`)
      }
    },
  },
]

export async function sendEmail({ to, subject, html }) {
  const from = FROM_DEFAULT
  let lastError = null

  for (const provider of providers) {
    try {
      if (!provider.key()) continue
      await provider.send({ to, subject, html, from })
      console.log(`Email sent via ${provider.name} to ${to}`)
      return { success: true, provider: provider.name }
    } catch (err) {
      lastError = err
      console.error(`${provider.name} failed:`, err.message)
      continue
    }
  }

  console.error('All email providers failed:', lastError?.message)
  return { success: false, error: lastError?.message }
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
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" style="${buttonStyle}">Start Shopping</a>
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
  })
}

export function sendOrderConfirmationEmail(to, name, order) {
  const total = typeof order.total === 'number' ? `$${order.total.toFixed(2)}` : order.total
  return sendEmail({
    to,
    subject: `Order Confirmed — #${order.orderNumber}`,
    html: wrap(`
      <h2 style="color:#1f2937;margin-top:0;">Order Confirmed!</h2>
      <p style="color:#4b5563;line-height:1.6;">
        Hi ${name}, thanks for your purchase! Your order has been placed successfully.
      </p>
      <div style="background:#f9fafb;border-radius:6px;padding:16px;margin:20px 0;">
        <p style="margin:0 0 8px;color:#374151;font-weight:600;">Order #${order.orderNumber}</p>
        <p style="margin:0;color:#4b5563;">Total: <strong style="color:#4f46e5;">${total}</strong></p>
      </div>
      <p style="color:#4b5563;line-height:1.6;">
        We'll notify you when your order ships. You can track your order status in your account.
      </p>
    `),
  })
}

export function sendOrderStatusEmail(to, name, orderNumber, status) {
  return sendEmail({
    to,
    subject: `Order #${orderNumber} — ${status}`,
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
