import mongoose from 'mongoose'

export const VERIFICATION_STATUS = {
  MATCHED: 'MATCHED',
  NAME_MISMATCH: 'NAME_MISMATCH',
  AMOUNT_MISMATCH: 'AMOUNT_MISMATCH',
  MISSING: 'MISSING',
  NEEDS_REVIEW: 'NEEDS_REVIEW',
}

const verificationResultSchema = {
  wagesheetAmount: Number,
  ecrAmount: Number,
  difference: Number,
  ecrName: String,
  nameSimilarity: Number,
  status: { type: String, enum: Object.values(VERIFICATION_STATUS) },
  reason: String,
  sourcePage: Number,
}

// Node only ever READS this collection — the Python worker writes it
// directly, same as parcel_results (see ParcelResult.js). One document per
// employee per verification batch (batchId == the shared Job's _id).
const complianceEmployeeResultSchema = new mongoose.Schema(
  {
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
    moduleId: { type: String, required: true },
    employee: {
      name: String,
      uan: String,
      ipNumber: String,
      agency: String,
      state: String,
    },
    wagesheet: {
      pfAmount: Number,
      esicAmount: Number,
    },
    pf: verificationResultSchema,
    esic: verificationResultSchema,
    rowErrors: [String],
    createdAt: { type: Date, default: Date.now },
  },
  { collection: 'compliance_employee_results' },
)

export default mongoose.model('ComplianceEmployeeResult', complianceEmployeeResultSchema)
