import mongoose from 'mongoose'

const FailedJobSchema = new mongoose.Schema(
  {
    queueName: { type: String, required: true, index: true },
    jobId: { type: String, required: true },
    jobName: { type: String, default: null },
    data: { type: mongoose.Schema.Types.Mixed, default: null },
    attemptsMade: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 1 },
    errorMessage: { type: String, required: true },
    errorStack: { type: String, default: null },
    failedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
)

FailedJobSchema.index({ queueName: 1, failedAt: -1 })
FailedJobSchema.index({ failedAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 })

const FailedJob = mongoose.model('FailedJob', FailedJobSchema)

export default FailedJob
