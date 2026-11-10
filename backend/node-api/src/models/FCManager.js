import mongoose from 'mongoose'

// Per-FC recipient configuration for alert/digest delivery — distinct
// from the global FINANCIAL_ALERT_EMAIL_TO/WEBHOOK env vars, which stay
// as the fallback when no FC-specific manager is configured. Read
// directly by the Python AI service (same shared-MongoDB pattern as
// financial_targets), not proxied through Node.
const fcManagerSchema = new mongoose.Schema(
  {
    fcName: { type: String, required: true, unique: true, index: true },
    managerName: { type: String },
    managerEmail: { type: String },
    managerPhone: { type: String },
    slackWebhookUrl: { type: String },
  },
  { collection: 'fc_managers', timestamps: true },
)

export default mongoose.model('FCManager', fcManagerSchema)
