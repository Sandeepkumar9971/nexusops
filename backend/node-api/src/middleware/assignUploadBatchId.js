import mongoose from 'mongoose'

// Generates the Job's _id up front, before Multer saves any files, so the
// upload directory and the Job document can share the same id.
export function assignUploadBatchId(req, res, next) {
  req.uploadBatchId = new mongoose.Types.ObjectId().toString()
  next()
}
