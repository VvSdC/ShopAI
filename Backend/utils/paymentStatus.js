export const PAYMENT_STATUS = {
  UNPAID: 'unpaid',
  PAID: 'paid',
}

/** Normalize legacy values (`Not paid`) and Stripe statuses to lowercase. */
export function normalizePaymentStatus(status) {
  const value = String(status || '')
    .trim()
    .toLowerCase()
  if (!value || value === 'not paid' || value === 'not_paid') {
    return PAYMENT_STATUS.UNPAID
  }
  if (value === 'paid') return PAYMENT_STATUS.PAID
  return value
}

export function isPaidPaymentStatus(status) {
  return normalizePaymentStatus(status) === PAYMENT_STATUS.PAID
}
