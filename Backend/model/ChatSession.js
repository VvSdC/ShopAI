import mongoose from 'mongoose'
import { CHAT_SESSION_MESSAGE_MAX_LENGTH } from '../constants/chatLimits.js'

/**
 * Chat sessions for the shopping assistant.
 *
 * MongoDB scaling note (document only — fine at current scale):
 * The app index `{ user: 1, updatedAt: -1 }` optimizes listing a user's conversations.
 * If you shard this collection, do NOT use `user` as the shard key — a power user's
 * sessions would pile onto one chunk. Prefer `{ _id: 1 }` (the session id returned as
 * `sessionId` in the API). Point lookups by session id stay targeted; list-by-user queries
 * become scatter-gather across shards. See docs/Chatbot.md § “Scaling and sharding”.
 */
const cartQueueItemSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true },
    name: { type: String, required: true },
    qty: { type: Number, default: 1, min: 1 },
  },
  { _id: false }
)

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
      maxlength: CHAT_SESSION_MESSAGE_MAX_LENGTH,
    },
    checkout: {
      checkoutUrl: { type: String },
      orderNumber: { type: String },
      orderId: { type: String },
      totalPrice: { type: Number },
    },
    catalogProducts: {
      type: [
        {
          id: { type: String, required: true },
          name: { type: String, default: '' },
        },
      ],
      default: undefined,
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
    messageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    cartQueue: {
      remaining: {
        type: [cartQueueItemSchema],
        default: undefined,
      },
    },
  },
  { timestamps: true }
)

ChatSessionSchema.index({ user: 1, updatedAt: -1 })

const ChatSession = mongoose.model('ChatSession', ChatSessionSchema)

export default ChatSession
