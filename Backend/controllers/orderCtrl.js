import asyncHandler from 'express-async-handler'
import dotenv from 'dotenv'
dotenv.config()
import Stripe from 'stripe'
import Order from '../model/Order.js'
import Product from '../model/Product.js'
import User from '../model/User.js'
import Coupon from '../model/Coupon.js'
//@desc create orders
//@route POST /api/v1/orders
//@access private

//stripe instance
const stripe = new Stripe(process.env.STRIPE_KEY)

function productIdKey(id) {
  if (id == null) return ''
  return String(id)
}

export const createOrderCtrl = asyncHandler(async (req, res) => {
  const couponCode = req?.query?.coupon
  let couponFound = null
  let discountRate = 0

  if (couponCode) {
    couponFound = await Coupon.findOne({ code: couponCode.toUpperCase() })
    if (!couponFound) {
      throw new Error('Coupon does not exist')
    }
    if (couponFound.isExpired) {
      throw new Error('Coupon has expired')
    }
    discountRate = couponFound.discount / 100
  }

  const { orderItems, shippingAddress } = req.body
  console.log(req.body)
  //Find the user
  const user = await User.findById(req.userAuthId)
  //Check if user has shipping address
  if (!user?.hasShippingAddress) {
    throw new Error('Please provide shipping address')
  }
  //Check if order is not empty
  if (orderItems?.length <= 0) {
    throw new Error('No Order Items')
  }

  //Validate each order item against current stock
  const orderProductIds = orderItems.map((item) => productIdKey(item._id)).filter(Boolean)
  const orderProducts = await Product.find({ _id: { $in: orderProductIds } })
  const orderProductMap = {}
  orderProducts.forEach((p) => {
    orderProductMap[productIdKey(p._id)] = p
  })

  const validatedItems = []
  let recalculatedTotal = 0
  for (const item of orderItems) {
    const product = orderProductMap[productIdKey(item._id)]
    if (!product) continue // skip deleted products
    const qtyLeft = product.totalQty - product.totalSold
    if (qtyLeft <= 0) continue // skip out of stock
    const finalQty = Math.min(item.qty, qtyLeft)
    const trustedPrice = product.price
    validatedItems.push({
      ...item,
      price: trustedPrice,
      qty: finalQty,
      totalPrice: trustedPrice * finalQty,
    })
    recalculatedTotal += trustedPrice * finalQty
  }

  if (validatedItems.length <= 0) {
    throw new Error('All items in your cart are unavailable or out of stock')
  }

  const finalTotal = discountRate > 0
    ? Math.round(recalculatedTotal * (1 - discountRate) * 100) / 100
    : recalculatedTotal

  const order = await Order.create({
    user: user?._id,
    orderItems: validatedItems,
    shippingAddress,
    totalPrice: finalTotal,
    ...(couponFound && { coupon: couponFound.code }),
  })

  //push order into user
  user.orders.push(order?._id)
  await user.save()

  //make payment (stripe)
  //convert order items to have same structure that stripe need
  const convertedOrders = validatedItems.map((item) => {
    const discountedPrice = discountRate > 0
      ? Math.round(item.price * (1 - discountRate) * 100)
      : item.price * 100
    return {
      price_data: {
        currency: 'inr',
        product_data: {
          name: item?.name,
          description: item?.description,
        },
        unit_amount: discountedPrice,
      },
      quantity: item?.qty,
    }
  })

  // Build address object from user's shipping address (Indian export compliance)
  const addr = user?.shippingAddress || {}
  const stripeAddress = {
    line1: addr.address || 'N/A',
    city: addr.city || '',
    state: addr.province || '',
    postal_code: addr.postalCode || '',
    country: addr.country || 'IN',
  }

  // Create a Stripe Customer with name, email, billing & shipping address
  // This satisfies Indian export regulations and pre-fills + locks email
  const stripeCustomer = await stripe.customers.create({
    name: user.fullname,
    email: user.email,
    address: stripeAddress,
    shipping: {
      name: `${addr.firstName || ''} ${addr.lastName || ''}`.trim() || user.fullname,
      phone: addr.phone || '',
      address: stripeAddress,
    },
  })

  const session = await stripe.checkout.sessions.create({
    line_items: convertedOrders,
    customer: stripeCustomer.id,
    metadata: {
      orderId: order?._id.toString(),
    },
    mode: 'payment',
    success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/cancel`,
  })
  res.send({ url: session.url })
})

//@desc verify payment by Stripe session ID and update order
//@route GET /api/v1/orders/verify-payment/:session_id
//@access private

export const verifyPaymentCtrl = asyncHandler(async (req, res) => {
  const session = await stripe.checkout.sessions.retrieve(req.params.session_id)
  if (!session) {
    throw new Error('Session not found')
  }
  const { orderId } = session.metadata
  if (!orderId) {
    throw new Error('No order associated with this session')
  }

  const existingOrder = await Order.findById(orderId)
  if (!existingOrder) {
    throw new Error('Order not found')
  }
  if (existingOrder.user.toString() !== req.userAuthId.toString()) {
    res.status(403)
    throw new Error('Not authorised to verify this payment')
  }
  const alreadyVerified = existingOrder?.paymentStatus === 'paid'

  const updatedOrder = await Order.findByIdAndUpdate(
    orderId,
    {
      totalPrice: session.amount_total / 100,
      currency: session.currency,
      paymentMethod: session.payment_method_types?.[0] || 'card',
      paymentStatus: session.payment_status,
    },
    { new: true }
  )

  //Update product stock only if payment succeeded and not already processed
  if (session.payment_status === 'paid' && updatedOrder && !alreadyVerified) {
    const orderItems = updatedOrder.orderItems || []
    const products = await Product.find({ _id: { $in: orderItems.map((i) => i._id) } })
    for (const item of orderItems) {
      const product = products.find(
        (p) => p._id.toString() === item._id?.toString()
      )
      if (product) {
        product.totalSold += item.qty || 1
        await product.save()
      }
    }
  }

  res.json({
    success: true,
    message: 'Payment verified',
    order: updatedOrder,
  })
})

//@desc get current user's orders (paginated)
//@route GET /api/v1/orders/my-orders
//@access private

export const getUserOrdersCtrl = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1
  const limit = parseInt(req.query.limit) || 5
  const skip = (page - 1) * limit

  const total = await Order.countDocuments({ user: req.userAuthId })
  const orders = await Order.find({ user: req.userAuthId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)

  res.json({
    success: true,
    message: 'User orders',
    orders,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
})

//@desc get all orders
//@route GET /api/v1/orders
//@access private

export const getAllordersCtrl = asyncHandler(async (req, res) => {
  //find all orders
  const orders = await Order.find().populate('user')
  res.json({
    success: true,
    message: 'All orders',
    orders,
  })
})

//@desc get single order
//@route GET /api/v1/orders/:id
//@access private/admin

export const getSingleOrderCtrl = asyncHandler(async (req, res) => {
  const id = req.params.id
  const order = await Order.findById(id)
  if (!order) {
    throw new Error('Order not found')
  }
  const user = await User.findById(req.userAuthId)
  if (order.user.toString() !== req.userAuthId.toString() && !user?.isAdmin) {
    res.status(403)
    throw new Error('Not authorised to view this order')
  }
  res.status(200).json({
    success: true,
    message: 'Single order',
    order,
  })
})

//@desc update order to delivered
//@route PUT /api/v1/orders/update/:id
//@access private/admin

export const updateOrderCtrl = asyncHandler(async (req, res) => {
  //get the id from params
  const id = req.params.id
  //update
  const updatedOrder = await Order.findByIdAndUpdate(
    id,
    {
      status: req.body.status,
    },
    {
      new: true,
    }
  )
  res.status(200).json({
    success: true,
    message: 'Order updated',
    updatedOrder,
  })
})

//@desc get sales sum of orders
//@route GET /api/v1/orders/sales/sum
//@access private/admin

export const getOrderStatsCtrl = asyncHandler(async (req, res) => {
  //get order stats
  const orders = await Order.aggregate([
    {
      $group: {
        _id: null,
        minimumSale: {
          $min: '$totalPrice',
        },
        totalSales: {
          $sum: '$totalPrice',
        },
        maxSale: {
          $max: '$totalPrice',
        },
        avgSale: {
          $avg: '$totalPrice',
        },
      },
    },
  ])
  //get the date
  const date = new Date()
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const saleToday = await Order.aggregate([
    {
      $match: {
        createdAt: {
          $gte: today,
        },
      },
    },
    {
      $group: {
        _id: null,
        totalSales: {
          $sum: '$totalPrice',
        },
      },
    },
  ])
  //send response
  res.status(200).json({
    success: true,
    message: 'Sum of orders',
    orders,
    saleToday,
  })
})

//@desc cancel order (user)
//@route PUT /api/v1/orders/cancel/:id
//@access private

export const cancelOrderCtrl = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
  if (!order) {
    throw new Error('Order not found')
  }
  // Only the order owner can cancel
  if (order.user.toString() !== req.userAuthId.toString()) {
    throw new Error('Not authorised to cancel this order')
  }
  // Can only cancel pending or processing orders
  if (!['pending', 'processing'].includes(order.status)) {
    throw new Error('Only pending or processing orders can be cancelled')
  }
  order.status = 'cancelled'
  await order.save()
  // Restore product stock
  for (const item of order.orderItems) {
    const product = await Product.findById(item._id)
    if (product) {
      product.totalSold = Math.max(0, product.totalSold - (item.qty || 1))
      await product.save()
    }
  }
  res.json({
    success: true,
    message: 'Order cancelled successfully',
    order,
  })
})
