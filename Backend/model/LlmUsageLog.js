import mongoose from 'mongoose'

const LlmUsageLogSchema = new mongoose.Schema(
  {
    source: {
      type: String,
      enum: ['chat', 'eval', 'inference_test', 'background', 'unknown'],
      default: 'unknown',
      index: true,
    },
    span: { type: String, default: 'completion' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    sessionId: { type: String, default: null },
    route: { type: String, default: null },
    provider: { type: String, required: true },
    model: { type: String, default: null },
    promptTokens: { type: Number, default: 0 },
    completionTokens: { type: Number, default: 0 },
    totalTokens: { type: Number, default: 0 },
    latencyMs: { type: Number, default: 0 },
    success: { type: Boolean, default: true },
  },
  { timestamps: true }
)

LlmUsageLogSchema.index({ createdAt: -1 })
LlmUsageLogSchema.index({ source: 1, createdAt: -1 })

const LlmUsageLog = mongoose.model('LlmUsageLog', LlmUsageLogSchema)

export default LlmUsageLog
