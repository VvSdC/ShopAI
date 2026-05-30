import mongoose from 'mongoose'

const returnItemSchema = new mongoose.Schema(
  {
    lineId: { type: String, required: true },
    productId: { type: String, required: true },
    name: { type: String, required: true },
    qty: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true },
    color: { type: String, default: '' },
    size: { type: String, default: '' },
    reasonCode: { type: String, required: true },
    reasonComment: { type: String, default: '' },
  },
  { _id: false }
)

const ReturnRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    orderNumber: { type: String, required: true },
    items: [returnItemSchema],
    status: {
      type: String,
      enum: ['requested', 'approved', 'rejected', 'refunded'],
      default: 'requested',
    },
    refundAmount: { type: Number, default: 0 },
    stripeRefundId: { type: String, default: null },
    adminNote: { type: String, default: '' },
    resolvedAt: { type: Date },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
)

ReturnRequestSchema.index({ user: 1, createdAt: -1 })
ReturnRequestSchema.index({ status: 1, createdAt: -1 })
ReturnRequestSchema.index({ order: 1 })

const ReturnRequest = mongoose.model('ReturnRequest', ReturnRequestSchema)

export default ReturnRequest
