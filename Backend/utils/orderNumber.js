import Counter from '../model/Counter.js'

const COUNTER_ID = 'orderNumber'
const PREFIX = 'ORD'
const PAD_LENGTH = 8

/**
 * Atomically allocate the next order number (ORD00000001, ORD00000002, …).
 * Safe under concurrent inserts via MongoDB findOneAndUpdate + upsert.
 */
export async function allocateOrderNumber() {
  const counter = await Counter.findOneAndUpdate(
    { _id: COUNTER_ID },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  )

  const seq = counter?.seq ?? 1
  if (seq > 10 ** PAD_LENGTH - 1) {
    throw new Error('Order number sequence exhausted')
  }

  return `${PREFIX}${String(seq).padStart(PAD_LENGTH, '0')}`
}
