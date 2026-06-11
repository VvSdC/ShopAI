import mongoose from 'mongoose'
import { allocateOrderNumber } from '../utils/orderNumber.js'

const Schema = mongoose.Schema

const OrderSchema = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    orderItems: [
      {
        type: Object,
        required: true,
      },
    ],
    shippingAddress: {
      type: Object,
      required: true,
    },
    orderNumber: {
      type: String,
    },
    coupon: {
      type: String,
      default: null,
    },
    paymentStatus: {
      type: String,
      default: 'Not paid',
    },
    paymentMethod: {
      type: String,
      default: 'Not specified',
    },
    totalPrice: {
      type: Number,
      default: 0.0,
    },
    currency: {
      type: String,
      default: 'Not specified',
    },
    //For admin
    status: {
      type: String,
      default: 'pending',
      enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    },
    deliveredAt: {
      type: Date,
    },
    stripeSessionId: {
      type: String,
      default: null,
    },
    checkoutExpiresAt: {
      type: Date,
      default: null,
    },
    checkoutSource: {
      type: String,
      enum: ['chat', 'cart'],
      default: 'cart',
    },
    stripePaymentIntentId: {
      type: String,
      default: null,
    },
    subtotalBeforeDiscount: {
      type: Number,
      default: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
    discountRate: {
      type: Number,
      default: 0,
    },
    totalRefunded: {
      type: Number,
      default: 0,
    },
    refundStatus: {
      type: String,
      enum: ['none', 'partial', 'full'],
      default: 'none',
    },
    stripeRefundIds: {
      type: [String],
      default: [],
    },
    postPaymentProcessed: {
      type: Boolean,
      default: false,
    },
    confirmationEmailSent: {
      type: Boolean,
      default: false,
    },
    confirmationEmailAttempts: {
      type: Number,
      default: 0,
    },
    lastConfirmationEmailAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
)

OrderSchema.pre('save', async function assignOrderNumber(next) {
  if (!this.isNew || this.orderNumber) {
    return next()
  }
  try {
    this.orderNumber = await allocateOrderNumber()
    next()
  } catch (err) {
    next(err)
  }
})

OrderSchema.index({ user: 1, createdAt: -1 })
OrderSchema.index({ orderNumber: 1 }, { unique: true })
OrderSchema.index({ status: 1 })
OrderSchema.index({ paymentStatus: 1, checkoutExpiresAt: 1 })

const Order = mongoose.model('Order', OrderSchema)

export default Order
