import mongoose from 'mongoose'

const RouteBreakdownSchema = new mongoose.Schema(
  {
    route: { type: String, default: 'unknown' },
    calls: { type: Number, default: 0 },
    totalTokens: { type: Number, default: 0 },
    latencySum: { type: Number, default: 0 },
  },
  { _id: false }
)

const ProviderBreakdownSchema = new mongoose.Schema(
  {
    provider: { type: String, default: 'unknown' },
    calls: { type: Number, default: 0 },
    totalTokens: { type: Number, default: 0 },
    latencySum: { type: Number, default: 0 },
  },
  { _id: false }
)

const LlmUsageSummarySchema = new mongoose.Schema(
  {
    /** UTC calendar day (YYYY-MM-DD). */
    date: { type: String, required: true, index: true },
    source: {
      type: String,
      enum: ['chat', 'eval', 'inference_test', 'background', 'unknown'],
      required: true,
      index: true,
    },
    calls: { type: Number, default: 0 },
    promptTokens: { type: Number, default: 0 },
    completionTokens: { type: Number, default: 0 },
    totalTokens: { type: Number, default: 0 },
    latencySum: { type: Number, default: 0 },
    successCount: { type: Number, default: 0 },
    byRoute: { type: [RouteBreakdownSchema], default: [] },
    byProvider: { type: [ProviderBreakdownSchema], default: [] },
    aggregatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

LlmUsageSummarySchema.index({ date: 1, source: 1 }, { unique: true })
LlmUsageSummarySchema.index({ source: 1, date: -1 })

const LlmUsageSummary = mongoose.model('LlmUsageSummary', LlmUsageSummarySchema)

export default LlmUsageSummary
