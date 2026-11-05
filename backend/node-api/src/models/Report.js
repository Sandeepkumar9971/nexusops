import mongoose from 'mongoose'

export const REPORT_TYPE = {
  CSV: 'csv',
  XLSX: 'xlsx',
  PDF: 'pdf',
}

// Generic report metadata, shared across modules — each module just
// registers what type(s) it produces and points at a jobId.
const reportSchema = new mongoose.Schema(
  {
    moduleId: { type: String, required: true, index: true },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
    type: { type: String, enum: Object.values(REPORT_TYPE), required: true },
    filePath: { type: String, required: true },
  },
  { timestamps: true },
)

export default mongoose.model('Report', reportSchema)
