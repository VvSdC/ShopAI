const IDEMPOTENCY_HEADER = 'Idempotency-Key'

export function createCartIdempotencyKey() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `cart-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function withCartIdempotency(config = {}) {
  return {
    ...config,
    headers: {
      ...(config.headers || {}),
      [IDEMPOTENCY_HEADER]: createCartIdempotencyKey(),
    },
  }
}
