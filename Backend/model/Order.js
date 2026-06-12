import mongoose from 'mongoose'
import { allocateOrderNumber } from '../utils/orderNumber.js'

const Schema = mongoose.Schema

/** Line item shape expected by normalizeOrderItems() / enrichNewOrderItem(). */
const OrderItemSchema = new Schema(
  {
    _id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true, trim: true },
    qty: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    totalPrice: { type: Number, min: 0 },
    color: { type: String, required: true, trim: true },
    size: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    image: { type: String, default: '' },
    lineId: { type: String, trim: true },
    lineStatus: {
      type: String,
      enum: ['active', 'cancelled', 'returned'],
      default: 'active',
    },
    cancelledQty: { type: Number, default: 0, min: 0 },
    returnedQty: { type: Number, default: 0, min: 0 },
  },
  { _id: true }
)

/** Snapshot of the shipping address at checkout (matches createOrderSchema). */
const ShippingAddressSchema = new Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    province: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
  },
  { _id: false }
)

const OrderSchema = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    orderItems: {
      type: [OrderItemSchema],
      required: true,
      validate: {
        validator: (items) => Array.isArray(items) && items.length > 0,
        message: 'Order must include at least one item',
      },
    },
    shippingAddress: {
      type: ShippingAddressSchema,
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
OrderSchema.index({ stripeSessionId: 1 }, { sparse: true })

const Order = mongoose.model('Order', OrderSchema)

export default Order
