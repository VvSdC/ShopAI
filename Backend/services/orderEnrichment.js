import ReturnRequest from '../model/ReturnRequest.js'
import { attachOrderDisplayStatus } from '../utils/orderDisplayStatus.js'

async function pendingReturnStatusByOrderId(orderIds) {
  if (!orderIds?.length) return new Map()

  const rows = await ReturnRequest.find({
    order: { $in: orderIds },
    status: 'requested',
  })
    .select('order status')
    .lean()

  return new Map(rows.map((row) => [String(row.order), row.status]))
}

export async function enrichOrderForResponse(order) {
  if (!order) return order
  const returnMap = await pendingReturnStatusByOrderId([order._id])
  return attachOrderDisplayStatus(order, {
    returnRequestStatus: returnMap.get(String(order._id)) || null,
  })
}

export async function enrichOrdersForResponse(orders) {
  if (!orders?.length) return []
  const returnMap = await pendingReturnStatusByOrderId(orders.map((o) => o._id))
  return orders.map((order) =>
    attachOrderDisplayStatus(order, {
      returnRequestStatus: returnMap.get(String(order._id)) || null,
    })
  )
}
