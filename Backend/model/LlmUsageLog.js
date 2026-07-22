import mongoose from 'mongoose'

const LlmUsageLogSchema = new mongoose.Schema(
  {
    source: {
      type: String,
      enum: ['chat', 'eval', 'inference_test', 'background', 'chat_tool', 'unknown'],
      default: 'unknown',
      index: true,
    },
    /** Pipeline stage, e.g. 'agent:retrieval:round-1', 'route-decision', 'eval-judge', 'tool'. */
    span: { type: String, default: 'completion', index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    sessionId: { type: String, default: null },
    requestId: { type: String, default: null, index: true },
    route: { type: String, default: null },
    routeReason: { type: String, default: null, maxlength: 500 },
    provider: { type: String, required: true },
    model: { type: String, default: null },
    promptTokens: { type: Number, default: 0 },
    completionTokens: { type: Number, default: 0 },
    totalTokens: { type: Number, default: 0 },
    /** Estimated USD cost — see services/llmPricing.js. Best-effort, not billing. */
    costUsd: { type: Number, default: 0 },
    latencyMs: { type: Number, default: 0 },
    success: { type: Boolean, default: true, index: true },
    /** Classified error label (rate_limit, timeout, invalid_response, api_error, etc.). */
    errorType: { type: String, default: null },
    /** First 500 chars of error text — helps root-cause spikes without leaking tokens. */
    errorMessage: { type: String, default: null, maxlength: 500 },
    /** Chat tool telemetry (only set when source='chat_tool'). */
    tool: { type: String, default: null, index: true },
    toolSuccess: { type: Boolean, default: null },
  },
  { timestamps: true }
)

LlmUsageLogSchema.index({ createdAt: -1 })
LlmUsageLogSchema.index({ source: 1, createdAt: -1 })
LlmUsageLogSchema.index({ span: 1, route: 1, createdAt: -1 })
LlmUsageLogSchema.index({ tool: 1, createdAt: -1 })
LlmUsageLogSchema.index({ success: 1, createdAt: -1 })
LlmUsageLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 })

const LlmUsageLog = mongoose.model('LlmUsageLog', LlmUsageLogSchema)

export default LlmUsageLog
