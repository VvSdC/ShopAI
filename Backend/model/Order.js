import mongoose from 'mongoose'
const Schema = mongoose.Schema
// Generate a new random order number per document (do not compute once at module load)
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
      default: () =>
        Math.random().toString(36).substring(7).toUpperCase() +
        Math.floor(1000 + Math.random() * 90000),
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

OrderSchema.index({ user: 1, createdAt: -1 })
OrderSchema.index({ orderNumber: 1 }, { unique: true })
OrderSchema.index({ status: 1 })

const Order = mongoose.model('Order', OrderSchema)

export default Order
