import { randomUUID } from 'crypto'

export function productIdKey(id) {
  if (id == null) return ''
  return String(id)
}

function toPlainItem(item) {
  if (item && typeof item.toObject === 'function') {
    return item.toObject()
  }
  return item
}

export function normalizeOrderItems(orderItems = []) {
  return orderItems.map((item, idx) => {
    const base = { ...toPlainItem(item) }
    if (!base.lineId) {
      base.lineId = `legacy-${idx}-${productIdKey(base._id)}`
    }
    if (!base.lineStatus) base.lineStatus = 'active'
    if (base.cancelledQty == null) base.cancelledQty = 0
    if (base.returnedQty == null) base.returnedQty = 0
    return base
  })
}

export function enrichNewOrderItem(item) {
  return {
    ...item,
    lineId: randomUUID(),
    lineStatus: 'active',
    cancelledQty: 0,
    returnedQty: 0,
  }
}

export function getActiveQty(item) {
  const qty = Number(item.qty) || 0
  const cancelled = Number(item.cancelledQty) || 0
  const returned = Number(item.returnedQty) || 0
  return Math.max(0, qty - cancelled - returned)
}

export function findOrderLine(order, lineId) {
  const items = normalizeOrderItems(order.orderItems)
  return items.find((item) => item.lineId === lineId) || null
}

export function computeLineRefundAmount(order, lineId, qty) {
  const item = findOrderLine(order, lineId)
  if (!item) throw new Error('Order line not found')

  const activeQty = getActiveQty(item)
  if (qty > activeQty) {
    throw new Error(`Cannot return more than ${activeQty} unit(s) for ${item.name}`)
  }

  const rate = Number(order.discountRate) || 0
  const unitAfterDiscount = Math.round(item.price * (1 - rate) * 100) / 100
  return Math.round(unitAfterDiscount * qty * 100) / 100
}

export function computeRefundTotal(order, lineQtyMap) {
  let total = 0
  for (const [lineId, qty] of Object.entries(lineQtyMap)) {
    total += computeLineRefundAmount(order, lineId, qty)
  }
  const remaining = (order.totalPrice || 0) - (order.totalRefunded || 0)
  if (total > remaining + 0.01) {
    return Math.max(0, Math.round(remaining * 100) / 100)
  }
  return Math.round(total * 100) / 100
}
