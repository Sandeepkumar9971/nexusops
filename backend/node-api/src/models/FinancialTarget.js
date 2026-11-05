import mongoose from 'mongoose'

// One document per metric (cm1, cm2, manpower_cost, …) — the single source
// of truth the Python calculation engine reads target ranges from. Never
// hardcoded in calculation code so a manager can update a limit without a
// deploy. A metric with no document here is reported as "unconfigured"
// rather than silently evaluated against a guessed range.
const financialTargetSchema = new mongoose.Schema(
  {
    metric: { type: String, required: true, unique: true, index: true },
    minimum: { type: Number },
    maximum: { type: Number },
    source: { type: String, default: 'configured' },
    effectiveDate: { type: Date, default: Date.now },
  },
  { collection: 'financial_targets', timestamps: true },
)

export default mongoose.model('FinancialTarget', financialTargetSchema)
