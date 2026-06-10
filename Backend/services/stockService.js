import Product from '../model/Product.js'

export class StockReservationError extends Error {
  constructor(productId, qty) {
    super(`Insufficient stock for product ${productId} (requested ${qty})`)
    this.name = 'StockReservationError'
    this.productId = productId
    this.qty = qty
  }
}

function normalizeQty(qty) {
  return Math.max(1, Number(qty) || 1)
}

/**
 * Atomically increment totalSold only when enough stock remains.
 * Returns the updated product document, or null if stock is insufficient.
 */
export async function atomicallyReserveStock(productId, qty) {
  const q = normalizeQty(qty)
  return Product.findOneAndUpdate(
    {
      _id: productId,
      $expr: { $gte: [{ $subtract: ['$totalQty', '$totalSold'] }, q] },
    },
    { $inc: { totalSold: q } },
    { new: true }
  )
}

/**
 * Release previously reserved stock (e.g. rollback on partial order failure).
 */
export async function releaseStock(productId, qty) {
  const q = normalizeQty(qty)
  await Product.findOneAndUpdate(
    { _id: productId },
    [{ $set: { totalSold: { $max: [0, { $subtract: ['$totalSold', q] }] } } }]
  )
}

async function rollbackReservedStock(reserved) {
  for (const { productId, qty } of reserved) {
    await releaseStock(productId, qty)
  }
}

/**
 * Reserve stock for each order line atomically. Rolls back prior lines on failure.
 */
export async function atomicallyReserveStockForOrderItems(orderItems) {
  const reserved = []
  try {
    for (const item of orderItems || []) {
      const productId = item?._id
      if (!productId) continue
      const qty = normalizeQty(item.qty)
      const updated = await atomicallyReserveStock(productId, qty)
      if (!updated) {
        throw new StockReservationError(String(productId), qty)
      }
      reserved.push({ productId, qty })
    }
  } catch (err) {
    await rollbackReservedStock(reserved)
    throw err
  }
}
