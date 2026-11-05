import mongoose from 'mongoose'

// Node only ever READS this collection — the Python worker writes it
// directly (per the shared-MongoDB architecture decision). Schema mirrors
// what service.py inserts in backend/python-ai.
const parcelResultSchema = new mongoose.Schema(
  {
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
    moduleId: { type: String, required: true },
    filename: { type: String, required: true },
    status: { type: String, required: true },
    ocrConfidence: Number,
    rawOcrText: String,
    extractionMethod: String,
    fields: {
      location: String,
      awb: String,
      length: Number,
      width: Number,
      height: Number,
      volume: Number,
      weight: Number,
      timestamp: String,
      sorterId: String,
      raw: mongoose.Schema.Types.Mixed,
    },
    errorReason: String,
    createdAt: Date,
  },
  { collection: 'parcel_results' },
)

export default mongoose.model('ParcelResult', parcelResultSchema)
