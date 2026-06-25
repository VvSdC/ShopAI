import mongoose from 'mongoose'

/** Stripe retries webhooks for up to 72 hours — keep dedupe records slightly longer. */
export const STRIPE_WEBHOOK_EVENT_TTL_SECONDS = 73 * 60 * 60

const StripeWebhookEventSchema = new mongoose.Schema(
  {
    stripeEventId: { type: String, required: true, unique: true, index: true },
    eventType: { type: String, required: true },
    orderId: { type: String, default: null },
    processedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

StripeWebhookEventSchema.index(
  { processedAt: 1 },
  { expireAfterSeconds: STRIPE_WEBHOOK_EVENT_TTL_SECONDS }
)

const StripeWebhookEvent = mongoose.model('StripeWebhookEvent', StripeWebhookEventSchema)

export default StripeWebhookEvent
