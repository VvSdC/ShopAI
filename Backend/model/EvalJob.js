import crypto from 'crypto'
import mongoose from 'mongoose'

const EvalJobSchema = new mongoose.Schema(
  {
    jobId: {
      type: String,
      required: true,
      unique: true,
      default: () => crypto.randomUUID(),
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['queued', 'running', 'completed', 'failed'],
      default: 'queued',
    },
    total: { type: Number, default: 0 },
    completed: { type: Number, default: 0 },
    currentCase: { type: mongoose.Schema.Types.Mixed, default: null },
    results: { type: Array, default: [] },
    summary: { type: mongoose.Schema.Types.Mixed, default: null },
    error: { type: String, default: null },
    startedAt: { type: Date, default: Date.now },
    finishedAt: { type: Date, default: null },
    /** Updated on each progress patch while running — used to detect stale jobs. */
    lastHeartbeatAt: { type: Date, default: null },
  },
  { timestamps: true }
)

/** Drop finished eval jobs after 30 days. */
EvalJobSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 })

const EvalJob = mongoose.model('EvalJob', EvalJobSchema)

export default EvalJob
