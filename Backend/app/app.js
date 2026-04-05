import dotenv from 'dotenv'
import cors from 'cors'
import Stripe from 'stripe'
import cookieParser from 'cookie-parser'
dotenv.config()
import express from 'express'
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

//db connect
dbConnect()
const app = express()
//cors - allow credentials for cookies
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}))
//cookie parser
app.use(cookieParser())
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
      if (endpointSecret) {
        // Verify signature when webhook secret is configured
        event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret)
      } else {
        // No webhook secret configured — parse the event directly
        // WARNING: This skips signature verification; set STRIPE_WEBHOOK_SECRET in production
        event = JSON.parse(request.body)
        console.warn('⚠️  Webhook signature verification skipped — set STRIPE_WEBHOOK_SECRET in .env')
      }
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

//pass incoming data
app.use(express.json())
//url encoded
app.use(express.urlencoded({ extended: true }))

//server static files
app.use(express.static('public'))
//routes
//Home route
app.get('/', (req, res) => {
  res.sendFile(path.join('public', 'index.html'))
})
app.use('/shopai/users/', userRoutes)
app.use('/shopai/products/', productsRouter)
app.use('/shopai/categories/', categoriesRouter)
app.use('/shopai/brands/', brandsRouter)
app.use('/shopai/colors/', colorRouter)
app.use('/shopai/reviews/', reviewRouter)
app.use('/shopai/orders/', orderRouter)
app.use('/shopai/coupons/', couponsRouter)
//err middleware
app.use(notFound)
app.use(globalErrhandler)

export default app
