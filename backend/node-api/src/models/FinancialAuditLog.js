import mongoose from 'mongoose'

// Written by Node whenever a user changes a FinancialAnomaly's status —
// the anomaly document itself is only ever updated (status/statusReason),
// never deleted, and this collection is the permanent record of who
// changed what and why.
const financialAuditLogSchema = new mongoose.Schema(
  {
    anomalyId: { type: mongoose.Schema.Types.ObjectId, ref: 'FinancialAnomaly', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    previousStatus: { type: String },
    newStatus: { type: String, required: true },
    reason: { type: String },
    timestamp: { type: Date, default: Date.now },
  },
  { collection: 'financial_audit_logs' },
)

export default mongoose.model('FinancialAuditLog', financialAuditLogSchema)
