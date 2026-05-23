import dotenv from 'dotenv'
dotenv.config()
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import cookieParser from 'cookie-parser'
import Stripe from 'stripe'
import path from 'path'
import dbConnect from '../config/dbConnect.js'
import { globalErrhandler, notFound } from '../middlewares/globalErrHandler.js'
import brandsRouter from '../routes/brandsRouter.js'
import categoriesRouter from '../routes/categoriesRouter.js'
import colorRouter from '../routes/colorRouter.js'
import orderRouter from '../routes/ordersRouter.js'
import productsRouter from '../routes/productsRoute.js'
import reviewRouter from '../routes/reviewRouter.js'
import userRoutes from '../routes/usersRoute.js'
import Order from '../model/Order.js'
import couponsRouter from '../routes/couponsRouter.js'
import chatRouter from '../routes/chatRouter.js'
import { processPaidOrder } from '../services/orderFulfillment.js'

dbConnect()
const app = express()

app.set('trust proxy', 1)

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}))

app.use(compression())

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}))

app.use(cookieParser())

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
})

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts, please try again later.' },
})

const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Chat rate limit reached. Please wait a moment.' },
})
//Stripe webhook
//stripe instance
const stripe = new Stripe(process.env.STRIPE_KEY)

// Stripe webhook secret — set STRIPE_WEBHOOK_SECRET in your .env file
// For local testing with Stripe CLI: stripe listen --forward-to localhost:2030/webhook
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

app.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (request, response) => {
    const sig = request.headers['stripe-signature']

    let event

    try {
      if (!endpointSecret) {
        console.error('STRIPE_WEBHOOK_SECRET is not set — rejecting webhook event')
        return response.status(500).json({ error: 'Webhook secret not configured' })
      }
      event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message)
      response.status(400).send(`Webhook Error: ${err.message}`)
      return
    }

    console.log('📩 Webhook event received:', event.type)

    if (event.type === 'checkout.session.completed') {
      //update the order
      const session = event.data.object
      const { orderId } = session.metadata
      const paymentStatus = session.payment_status
      const paymentMethod = session.payment_method_types?.[0] || 'card'
      const totalAmount = session.amount_total
      const currency = session.currency

      // orderId is stored as a plain string in metadata
      const parsedOrderId = orderId?.replace(/"/g, '')
      console.log('✅ Payment completed — updating order:', parsedOrderId, { paymentStatus, paymentMethod, currency, totalAmount })

      if (!parsedOrderId) {
        console.error('❌ No orderId found in session metadata')
        return response.status(400).json({ error: 'Missing orderId in metadata' })
      }

      try {
        //find the order and update payment status
        const updatedOrder = await Order.findByIdAndUpdate(
          parsedOrderId,
          {
            totalPrice: totalAmount / 100,
            currency,
            paymentMethod,
            paymentStatus,
          },
          { new: true }
        )

        if (updatedOrder) {
          console.log('✅ Order updated successfully:', updatedOrder._id, '→', updatedOrder.paymentStatus)
          if (paymentStatus === 'paid') {
            const receiptEmail =
              session.customer_details?.email || session.customer_email || null
            const fulfillment = await processPaidOrder(parsedOrderId, { receiptEmail })
            if (fulfillment.emailSent) {
              console.log('📧 Order confirmation email sent for', updatedOrder.orderNumber)
            } else if (fulfillment.processed && !fulfillment.emailSent) {
              console.warn('⚠️ Order processed but confirmation email failed:', fulfillment.emailError)
            }
          }
        } else {
          console.error('❌ Order not found for ID:', parsedOrderId)
        }
      } catch (dbErr) {
        console.error('❌ Failed to update order in DB:', dbErr.message)
      }
    }
    response.status(200).json({ received: true })
  }
)

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use(express.static('public'))

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.get('/', (req, res) => {
  res.sendFile(path.join('public', 'index.html'))
})

app.use('/shopai/users/', apiLimiter, userRoutes)
app.use('/shopai/users/login', authLimiter)
app.use('/shopai/users/register', authLimiter)
app.use('/shopai/products/', apiLimiter, productsRouter)
app.use('/shopai/categories/', apiLimiter, categoriesRouter)
app.use('/shopai/brands/', apiLimiter, brandsRouter)
app.use('/shopai/colors/', apiLimiter, colorRouter)
app.use('/shopai/reviews/', apiLimiter, reviewRouter)
app.use('/shopai/orders/', apiLimiter, orderRouter)
app.use('/shopai/coupons/', apiLimiter, couponsRouter)
app.use('/shopai/chat/', chatLimiter, chatRouter)
//err middleware
app.use(notFound)
app.use(globalErrhandler)

export default app
