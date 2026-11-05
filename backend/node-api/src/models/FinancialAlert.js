import mongoose from 'mongoose'

export const ALERT_CHANNEL = {
  IN_APP: 'IN_APP',
  EMAIL: 'EMAIL',
  SLACK: 'SLACK',
  WHATSAPP: 'WHATSAPP',
}

export const ALERT_DELIVERY_STATUS = {
  SENT: 'SENT',
  FAILED: 'FAILED',
  PENDING_CONFIGURATION: 'PENDING_CONFIGURATION',
}

// Node only ever READS this collection — the Python worker writes it
// directly as part of batch processing (see alert_dispatcher.py). One
// document per (batchId, fcId, date, channel) — that tuple is the
// de-duplication key, enforced by the unique index below, so re-processing
// or a retry can never create a second alert for the same thing.
const financialAlertSchema = new mongoose.Schema(
  {
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
    fcId: { type: String },
    fcName: { type: String },
    date: { type: String, required: true, index: true },
    alertType: { type: String }, // the FC status (RED/YELLOW/BLUE) that triggered this alert
    message: { type: String },
    channel: { type: String, enum: Object.values(ALERT_CHANNEL), required: true },
    deliveryStatus: { type: String, enum: Object.values(ALERT_DELIVERY_STATUS), required: true },
    deliveryError: { type: String },
    sentAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: 'financial_alerts' },
)

// fcName (not just fcId) is part of the key because fcId is often absent
// (an FC identified only by name) — without fcName here, every
// fcId-less FC on the same date/channel would collide under this index.
financialAlertSchema.index({ batchId: 1, fcId: 1, fcName: 1, date: 1, channel: 1 }, { unique: true })

export default mongoose.model('FinancialAlert', financialAlertSchema)
