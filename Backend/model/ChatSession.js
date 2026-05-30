import mongoose from 'mongoose'

const chatMessageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    checkout: {
      checkoutUrl: { type: String },
      orderNumber: { type: String },
      orderId: { type: String },
      totalPrice: { type: Number },
    },
  },
  { timestamps: true }
)

const ChatSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: 'New conversation',
      trim: true,
    },
    messages: {
      type: [chatMessageSchema],
      default: [],
    },
  },
  { timestamps: true }
)

ChatSessionSchema.index({ user: 1, updatedAt: -1 })

const ChatSession = mongoose.model('ChatSession', ChatSessionSchema)

export default ChatSession
