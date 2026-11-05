import mongoose from 'mongoose'

export const FC_STATUS = {
  RED: 'RED',
  YELLOW: 'YELLOW',
  GREEN: 'GREEN',
  BLUE: 'BLUE',
  UNKNOWN: 'UNKNOWN',
}

const insightSchema = {
  summary: String,
  topContributors: [mongoose.Schema.Types.Mixed],
  recommendedAction: String,
}

// Node only ever READS this collection — the Python worker writes it
// directly, same as every other module's per-record result collection.
// One document per FC per date per processed batch; the FC dashboard and
// detail pages read the most recent document per (fcId/fcName, date) so a
// re-uploaded correction naturally supersedes an older record without ever
// deleting history.
const fcDailyFinancialSchema = new mongoose.Schema(
  {
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
    moduleId: { type: String, required: true, index: true },
    date: { type: String, required: true, index: true }, // ISO yyyy-mm-dd
    fcId: { type: String, index: true },
    fcName: { type: String, required: true, index: true },
    revenue: { type: Number, required: true },
    costAmounts: { type: mongoose.Schema.Types.Mixed },
    costPercentages: { type: mongoose.Schema.Types.Mixed },
    cm1: { type: Number },
    cm1Percentage: { type: Number },
    cm2: { type: Number },
    cm2Percentage: { type: Number },
    overallStatus: { type: String, enum: Object.values(FC_STATUS) },
    flaggedCosts: [String],
    rowErrors: [String],
    insight: insightSchema,
    createdAt: { type: Date, default: Date.now },
  },
  { collection: 'fc_daily_financials' },
)

fcDailyFinancialSchema.index({ fcName: 1, date: 1 })

export default mongoose.model('FCDailyFinancial', fcDailyFinancialSchema)
