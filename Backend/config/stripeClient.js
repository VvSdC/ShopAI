import Stripe from 'stripe'
import { config } from './env.js'

let client = null

export function hasStripeConfigured() {
  return Boolean(config.stripe.secretKey)
}

/** Lazy Stripe client — uses validated config, not raw process.env. */
export function getStripeClient() {
  if (!config.stripe.secretKey) {
    throw new Error('STRIPE_KEY is not configured')
  }
  if (!client) {
    client = new Stripe(config.stripe.secretKey)
  }
  return client
}
