import mongoose from 'mongoose'
import Order from '../model/Order.js'

/** True when the user has a delivered order that includes this product (active line). */
export async function userHasDeliveredPurchase(userId, productId) {
  if (!userId || !productId) return false

  const productObjectId = new mongoose.Types.ObjectId(String(productId))

  return Boolean(
    await Order.exists({
      user: userId,
      status: 'delivered',
      orderItems: {
        $elemMatch: {
          _id: productObjectId,
          lineStatus: 'active',
        },
      },
    })
  )
}
