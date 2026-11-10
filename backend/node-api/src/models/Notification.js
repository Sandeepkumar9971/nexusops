import mongoose from 'mongoose'

export const NOTIFICATION_SEVERITY = {
  INFO: 'INFO',
  SUCCESS: 'SUCCESS',
  WARNING: 'WARNING',
  CRITICAL: 'CRITICAL',
}

export const NOTIFICATION_TYPE = {
  PROCESSING_COMPLETED: 'PROCESSING_COMPLETED',
  PROCESSING_FAILED: 'PROCESSING_FAILED',
  PROCESSING_NEEDS_REVIEW: 'PROCESSING_NEEDS_REVIEW',
  PARCEL_EXTRACTION_EXCEPTION: 'PARCEL_EXTRACTION_EXCEPTION',
  COMPLIANCE_MISMATCH: 'COMPLIANCE_MISMATCH',
  FINANCIAL_CRITICAL_ANOMALY: 'FINANCIAL_CRITICAL_ANOMALY',
  FINANCIAL_DIGEST_READY: 'FINANCIAL_DIGEST_READY',
}

// Central, cross-module notification record. Every module (Python or Node)
// funnels through notificationService.createNotification() instead of
// writing here directly, so dedup/broadcast always happen consistently.
const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    moduleId: { type: String, required: true, index: true },
    type: { type: String, enum: Object.values(NOTIFICATION_TYPE), required: true },
    severity: { type: String, enum: Object.values(NOTIFICATION_SEVERITY), required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
    // Opaque pointer to whatever the notification is about (an anomaly id,
    // an FC name, an employee id) — the frontend knows how to route each
    // `type` to the right detail view using this plus jobId.
    relatedEntity: { type: mongoose.Schema.Types.Mixed },
    read: { type: Boolean, default: false, index: true },
    readAt: { type: Date },
    // One notification per real-world event, even if the triggering job is
    // somehow reprocessed or the emitting call retries — e.g.
    // "financial-critical-anomaly:<jobId>:<fcName>:<date>". Enforced by the
    // unique index below; a duplicate createNotification() call is a no-op.
    dedupeKey: { type: String, required: true, unique: true },
  },
  { timestamps: true },
)

export default mongoose.model('Notification', notificationSchema)
