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

export const createOrderCtrl = asyncHandler(async (req, res) => {
  //get the coupon
  const coupon = req?.query?.coupon

  const couponFound = await Coupon.findOne({
    code: coupon ? coupon.toUpperCase() : undefined,
  })
  if (couponFound?.isExpired) {
    throw new Error('Coupon has expired')
  }
  if (!couponFound && couponFound?.length > 0) {
    throw new Error('Coupon does exists')
  }

  // get discount
  // const discount = couponFound?.discount / 100

  //Get the payload(customer, orderItems, shipppingAddress, totalPrice);
  const { orderItems, shippingAddress, totalPrice } = req.body
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
  //Place/create order - save into DB
  const order = await Order.create({
    user: user?._id,
    orderItems,
    shippingAddress,
    // totalPrice: couponFound ? totalPrice - totalPrice * discount :
    totalPrice,
  })

  //Update the product qty
  const products = await Product.find({ _id: { $in: orderItems } })

  orderItems?.map(async (order) => {
    const product = products?.find((product) => {
      return product?._id?.toString() === order?._id?.toString()
    })
    if (product) {
      product.totalSold += order.qty
    }
    await product.save()
  })
  //push order into user
  user.orders.push(order?._id)
  await user.save()

  //make payment (stripe)
  //convert order items to have same structure that stripe need
  const convertedOrders = orderItems.map((item) => {
    return {
      price_data: {
        currency: 'inr',
        product_data: {
          name: item?.name,
          description: item?.description,
        },
        unit_amount: item?.price * 100,
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
    success_url: 'http://localhost:3000/success?session_id={CHECKOUT_SESSION_ID}',
    cancel_url: 'http://localhost:3000/cancel',
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
  //get the id from params
  const id = req.params.id
  const order = await Order.findById(id)
  //send response
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
