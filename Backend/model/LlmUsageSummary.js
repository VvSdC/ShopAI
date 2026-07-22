import mongoose from 'mongoose'

const RouteBreakdownSchema = new mongoose.Schema(
  {
    route: { type: String, default: 'unknown' },
    calls: { type: Number, default: 0 },
    totalTokens: { type: Number, default: 0 },
    latencySum: { type: Number, default: 0 },
    costUsd: { type: Number, default: 0 },
  },
  { _id: false }
)

const ProviderBreakdownSchema = new mongoose.Schema(
  {
    provider: { type: String, default: 'unknown' },
    calls: { type: Number, default: 0 },
    totalTokens: { type: Number, default: 0 },
    latencySum: { type: Number, default: 0 },
    costUsd: { type: Number, default: 0 },
    errorCount: { type: Number, default: 0 },
  },
  { _id: false }
)

const SpanBreakdownSchema = new mongoose.Schema(
  {
    span: { type: String, default: 'unknown' },
    calls: { type: Number, default: 0 },
    totalTokens: { type: Number, default: 0 },
    latencySum: { type: Number, default: 0 },
    costUsd: { type: Number, default: 0 },
  },
  { _id: false }
)

const ToolBreakdownSchema = new mongoose.Schema(
  {
    tool: { type: String, default: 'unknown' },
    calls: { type: Number, default: 0 },
    latencySum: { type: Number, default: 0 },
    errorCount: { type: Number, default: 0 },
  },
  { _id: false }
)

const ErrorBreakdownSchema = new mongoose.Schema(
  {
    errorType: { type: String, default: 'unknown' },
    count: { type: Number, default: 0 },
  },
  { _id: false }
)

const LlmUsageSummarySchema = new mongoose.Schema(
  {
    /** UTC calendar day (YYYY-MM-DD). */
    date: { type: String, required: true, index: true },
    source: {
      type: String,
      enum: ['chat', 'eval', 'inference_test', 'background', 'chat_tool', 'unknown'],
      required: true,
      index: true,
    },
    calls: { type: Number, default: 0 },
    promptTokens: { type: Number, default: 0 },
    completionTokens: { type: Number, default: 0 },
    totalTokens: { type: Number, default: 0 },
    latencySum: { type: Number, default: 0 },
    successCount: { type: Number, default: 0 },
    errorCount: { type: Number, default: 0 },
    costUsd: { type: Number, default: 0 },
    byRoute: { type: [RouteBreakdownSchema], default: [] },
    byProvider: { type: [ProviderBreakdownSchema], default: [] },
    bySpan: { type: [SpanBreakdownSchema], default: [] },
    byTool: { type: [ToolBreakdownSchema], default: [] },
    byError: { type: [ErrorBreakdownSchema], default: [] },
    aggregatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

LlmUsageSummarySchema.index({ date: 1, source: 1 }, { unique: true })
LlmUsageSummarySchema.index({ source: 1, date: -1 })

const LlmUsageSummary = mongoose.model('LlmUsageSummary', LlmUsageSummarySchema)

export default LlmUsageSummary
