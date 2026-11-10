import mongoose from 'mongoose'

export const ANOMALY_SEVERITY = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
  INFO: 'INFO',
}

export const ANOMALY_STATUS = {
  OPEN: 'OPEN',
  UNDER_REVIEW: 'UNDER_REVIEW',
  RESOLVED: 'RESOLVED',
  IGNORED: 'IGNORED',
}

// Python writes the anomaly as detected (status always starts OPEN); Node
// owns mutating `status`/`statusReason` afterwards via the anomaly
// management UI — the originally detected values are never altered, only
// the review status changes, with every change recorded in
// FinancialAuditLog so the original finding is never silently lost.
const financialAnomalySchema = new mongoose.Schema(
  {
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
    moduleId: { type: String, required: true, index: true },
    dailyFinancialId: { type: mongoose.Schema.Types.ObjectId, ref: 'FCDailyFinancial' },
    date: { type: String, required: true, index: true },
    fcId: { type: String },
    fcName: { type: String, required: true, index: true },
    metric: { type: String, required: true },
    actualValue: { type: Number },
    targetRange: {
      minimum: Number,
      maximum: Number,
      source: String,
    },
    deviation: { type: Number },
    financialImpact: { type: Number },
    severity: { type: String, enum: Object.values(ANOMALY_SEVERITY), index: true },
    explanation: { type: String },
    recommendation: { type: String },
    // Consecutive days (including this one) this exact cost line has
    // breached its target for this FC, looking back across every batch
    // ever processed for it — null for CM1/CM2/data-quality findings,
    // which don't have this per-line-item history. 1 = first time seen.
    recurringStreak: { type: Number, default: null },
    status: { type: String, enum: Object.values(ANOMALY_STATUS), default: ANOMALY_STATUS.OPEN, index: true },
    statusReason: { type: String },
  },
  { collection: 'financial_anomalies', timestamps: true },
)

export default mongoose.model('FinancialAnomaly', financialAnomalySchema)
