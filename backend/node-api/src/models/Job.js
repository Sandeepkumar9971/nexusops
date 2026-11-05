import mongoose from 'mongoose'

export const JOB_STATUS = {
  PENDING: 'PENDING',
  QUEUED: 'QUEUED',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  PARTIALLY_COMPLETED: 'PARTIALLY_COMPLETED',
}

// Generic job record shared by every module. A module never gets its own
// "jobs" collection — it just writes moduleId + its own result collection
// (e.g. parcel_results) referencing this job's _id.
const jobSchema = new mongoose.Schema(
  {
    moduleId: { type: String, required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    inputFiles: [{ type: String }],
    totalRecords: { type: Number, default: 0 },
    processedRecords: { type: Number, default: 0 },
    successfulRecords: { type: Number, default: 0 },
    failedRecords: { type: Number, default: 0 },
    status: {
      type: String,
      enum: Object.values(JOB_STATUS),
      default: JOB_STATUS.PENDING,
      index: true,
    },
    progressPercentage: { type: Number, default: 0 },
    // Optional, generic label for multi-stage pipelines (e.g. "Parsing
    // wagesheet…", "Matching PF records…") — any module can set it; those
    // that don't just never populate it.
    currentStage: { type: String },
    // Optional, generic batch-level aggregate a module computes once at the
    // end of processing (e.g. FC Financial Monitor's total revenue/average
    // CM1-CM2/status counts) — a dashboard can read it straight off the Job
    // instead of every module needing its own summary collection.
    summary: { type: mongoose.Schema.Types.Mixed },
    completedAt: { type: Date },
    error: {
      message: String,
      details: mongoose.Schema.Types.Mixed,
    },
  },
  { timestamps: true },
)

export default mongoose.model('Job', jobSchema)
