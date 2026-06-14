import '../openapi/initZodOpenApi.js'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import { buildHelmetOptions } from '../config/helmetConfig.js'
import { requestIdMiddleware } from '../middlewares/requestId.js'
import { validateCsrf } from '../middlewares/csrfProtection.js'
import { getStripeClient, hasStripeConfigured } from '../config/stripeClient.js'
import { apiLimiter, authLimiter, chatLimiter } from '../config/rateLimiters.js'
import path from 'path'
import { fileURLToPath } from 'url'
import { config } from '../config/env.js'
import { isRedisDegraded } from '../config/redisClient.js'
import { globalErrhandler, notFound } from '../middlewares/globalErrHandler.js'
import { mountOpenApi } from '../openapi/swagger.js'
import brandsRouter from '../routes/brandsRouter.js'
import categoriesRouter from '../routes/categoriesRouter.js'
import colorRouter from '../routes/colorRouter.js'
import orderRouter from '../routes/ordersRouter.js'
import productsRouter from '../routes/productsRoute.js'
import reviewRouter from '../routes/reviewRouter.js'
import userRoutes, { loginRoute, registerRoute } from '../routes/usersRoute.js'
import couponsRouter from '../routes/couponsRouter.js'
import chatRouter from '../routes/chatRouter.js'
import cartRouter from '../routes/cartRouter.js'
import policyRouter from '../routes/policyRouter.js'
import returnsRouter from '../routes/returnsRouter.js'
import analyticsRouter from '../routes/analyticsRouter.js'
import { orderService } from '../services/orderService.js'
import { parseOrderId } from '../services/orderFulfillment.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.join(__dirname, '..', 'public')
import {
  enqueueCheckoutFulfillment,
  isCheckoutFulfillmentQueueEnabled,
} from '../services/checkoutFulfillmentQueue.js'
import logger from '../utils/logger.js'

const app = express()

app.set('trust proxy', config.server.trustProxy ? 1 : false)

app.use(requestIdMiddleware)

app.use(helmet(buildHelmetOptions()))

app.use(compression())

app.use(cors({
  origin: config.cors.origin,
  credentials: config.cors.credentials,
}))

app.use(cookieParser())

app.use(validateCsrf)

const endpointSecret = config.stripe.webhookSecret

app.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (request, response) => {
    if (!hasStripeConfigured()) {
      return response.status(503).json({ error: 'Stripe is not configured' })
    }

    const stripe = getStripeClient()
    const sig = request.headers['stripe-signature']
    let event

    try {
      if (!endpointSecret) {
        logger.error('STRIPE_WEBHOOK_SECRET is not set — rejecting webhook event')
        return response.status(500).json({ error: 'Webhook secret not configured' })
      }
      event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret)
    } catch (err) {
      logger.error('Webhook signature verification failed:', err.message)
      response.status(400).send(`Webhook Error: ${err.message}`)
      return
    }

    logger.log('📩 Webhook event received:', event.type)

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const { orderId } = session.metadata
      const paymentStatus = session.payment_status
      const paymentMethod = session.payment_method_types?.[0] || 'card'
      const totalAmount = session.amount_total
      const currency = session.currency

      const parsedOrderId = parseOrderId(orderId)
      logger.log('✅ Payment completed — updating order:', parsedOrderId, { paymentStatus, paymentMethod, currency, totalAmount })

      if (!parsedOrderId) {
        logger.error('❌ No orderId found in session metadata')
        return response.status(400).json({ error: 'Missing orderId in metadata' })
      }

      const receiptEmail =
        session.customer_details?.email || session.customer_email || null

      try {
        let processedInline = false

        if (isCheckoutFulfillmentQueueEnabled()) {
          const queued = await enqueueCheckoutFulfillment({
            orderId: parsedOrderId,
            sessionId: session.id,
            receiptEmail,
            stripeEventId: event.id,
          })

          if (queued) {
            logger.log('✅ Payment fulfillment queued for order:', parsedOrderId)
          } else {
            processedInline = true
          }
        } else {
          processedInline = true
        }

        if (processedInline) {
          const { updatedOrder, fulfillment } = await orderService.applyStripeCheckoutSession(
            parsedOrderId,
            session,
            { receiptEmail }
          )

          if (updatedOrder) {
            logger.log('✅ Order updated successfully:', updatedOrder._id, '→', updatedOrder.paymentStatus)
            if (paymentStatus === 'paid' && fulfillment?.emailSent) {
              logger.log('📧 Order confirmation email sent for', updatedOrder.orderNumber)
            } else if (fulfillment?.processed && !fulfillment?.emailSent) {
              logger.warn('⚠️ Order processed but confirmation email failed:', fulfillment.emailError)
            }
          } else {
            logger.error('❌ Order not found for ID:', parsedOrderId)
          }
        }
      } catch (err) {
        logger.error('❌ Checkout webhook handling failed:', err.message)
        return response.status(500).json({ error: 'Webhook processing failed' })
      }
    }
    response.status(200).json({ received: true })
  }
)

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use(express.static(publicDir))

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    env: config.nodeEnv,
    timestamp: new Date().toISOString(),
    redis: isRedisDegraded() ? 'degraded' : 'ok',
  })
})

if (config.openapi.enabled) {
  mountOpenApi(app)
}

app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'))
})

app.use('/shopai/users/login', authLimiter, loginRoute)
app.use('/shopai/users/register', authLimiter, registerRoute)
app.use('/shopai/users/', apiLimiter, userRoutes)
app.use('/shopai/products/', apiLimiter, productsRouter)
app.use('/shopai/categories/', apiLimiter, categoriesRouter)
app.use('/shopai/brands/', apiLimiter, brandsRouter)
app.use('/shopai/colors/', apiLimiter, colorRouter)
app.use('/shopai/reviews/', apiLimiter, reviewRouter)
app.use('/shopai/orders/', apiLimiter, orderRouter)
app.use('/shopai/coupons/', apiLimiter, couponsRouter)
app.use('/shopai/cart/', apiLimiter, cartRouter)
app.use('/shopai/policy/', apiLimiter, policyRouter)
app.use('/shopai/returns/', apiLimiter, returnsRouter)
app.use('/shopai/chat/', chatLimiter, chatRouter)
app.use('/shopai/analytics/', apiLimiter, analyticsRouter)

app.use(notFound)
app.use(globalErrhandler)

export default app
