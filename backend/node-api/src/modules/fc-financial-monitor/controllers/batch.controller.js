import fs from 'fs'
import path from 'path'
import mongoose from 'mongoose'
import Job, { JOB_STATUS } from '../../../models/Job.js'
import Report, { REPORT_TYPE } from '../../../models/Report.js'
import { asyncHandler } from '../../../middleware/asyncHandler.js'
import pythonAiClient from '../../../services/pythonAiClient.js'
import { UPLOAD_ROOT } from '../../../config/paths.js'
import { findRecentDuplicateJob } from '../../../services/duplicateJobGuard.js'

const MODULE_ID = 'fc-financial-monitor'
const STAGING_SUBFOLDER = 'fc-financial-monitor/staging'
const BATCH_SUBFOLDER = 'fc-financial-monitor'

// Upload workspace flow is two steps: (1) upload + preview, before a Job
// exists at all, so the user can see detected columns / record counts and
// fix a column mapping without committing to a batch; (2) "Process
// Financial Data", which actually creates the Job. The staged file sits on
// disk under a throwaway id until step 2 moves it into the batch's
// permanent folder, or it's abandoned (never processed) and can be cleaned
// up like any other orphaned upload.
export const previewBatch = asyncHandler(async (req, res) => {
  const file = req.file
  if (!file) {
    res.status(400)
    throw new Error('No file uploaded.')
  }

  const stagingId = req.uploadBatchId
  // multer parses non-file multipart fields into req.body alongside the
  // uploaded file — this is how a single-FC file (no FC Name/ID column at
  // all) gets a name to apply to every row.
  const defaultFcName = req.body?.defaultFcName || null
  let preview
  try {
    const { data } = await pythonAiClient.post('/preview-financial-file', {
      file_path: path.resolve(file.path),
      default_fc_name: defaultFcName,
    })
    preview = data
  } catch (err) {
    res.status(502)
    throw new Error('Could not reach the Python AI service to preview this file.')
  }

  res.json({
    stagingId,
    fileName: file.filename,
    fileSize: file.size,
    ...preview,
  })
})

// Re-runs the preview against the SAME already-staged file with a new
// column mapping — the user adjusting one dropdown shouldn't require
// re-uploading the file from scratch.
export const remapPreview = asyncHandler(async (req, res) => {
  const { stagingId, fileName, columnMapping, defaultFcName } = req.body
  if (!stagingId || !fileName) {
    res.status(400)
    throw new Error('stagingId and fileName are required.')
  }

  const stagedPath = path.join(UPLOAD_ROOT, STAGING_SUBFOLDER, stagingId, fileName)
  if (!fs.existsSync(stagedPath)) {
    res.status(400)
    throw new Error('Staged file not found — please re-upload.')
  }

  let preview
  try {
    const { data } = await pythonAiClient.post('/preview-financial-file', {
      file_path: path.resolve(stagedPath),
      column_mapping: columnMapping || null,
      default_fc_name: defaultFcName || null,
    })
    preview = data
  } catch (err) {
    res.status(502)
    throw new Error('Could not reach the Python AI service to re-preview this file.')
  }

  res.json({ stagingId, fileName, ...preview })
})

export const createBatch = asyncHandler(async (req, res) => {
  const { stagingId, fileName, columnMapping, defaultFcName } = req.body
  if (!stagingId || !fileName) {
    res.status(400)
    throw new Error('stagingId and fileName are required.')
  }

  const stagedPath = path.join(UPLOAD_ROOT, STAGING_SUBFOLDER, stagingId, fileName)
  if (!fs.existsSync(stagedPath)) {
    res.status(400)
    throw new Error('Staged file not found — please re-upload.')
  }

  const duplicate = await findRecentDuplicateJob({ moduleId: MODULE_ID, userId: req.user.id, inputFiles: [fileName] })
  if (duplicate) {
    fs.rmSync(path.join(UPLOAD_ROOT, STAGING_SUBFOLDER, stagingId), { recursive: true, force: true })
    res.status(200).json({ job: duplicate, deduplicated: true })
    return
  }

  const jobId = new mongoose.Types.ObjectId().toString()
  const batchDir = path.join(UPLOAD_ROOT, BATCH_SUBFOLDER, jobId)
  fs.mkdirSync(batchDir, { recursive: true })
  const finalPath = path.join(batchDir, fileName)
  fs.renameSync(stagedPath, finalPath)
  fs.rmSync(path.join(UPLOAD_ROOT, STAGING_SUBFOLDER, stagingId), { recursive: true, force: true })

  const job = await Job.create({
    _id: jobId,
    moduleId: MODULE_ID,
    userId: req.user.id,
    inputFiles: [fileName],
    status: JOB_STATUS.PENDING,
  })

  try {
    await pythonAiClient.post('/process-financial-batch', {
      job_id: job._id.toString(),
      filename: fileName,
      column_mapping: columnMapping || null,
      default_fc_name: defaultFcName || null,
    })
  } catch (err) {
    // Job stays PENDING if Python is unreachable — same fallback behavior
    // as every other module; the upload itself still succeeded.
    console.error('Failed to trigger Python financial processing:', err.message)
  }

  res.status(201).json({ job })
})

export const listBatches = asyncHandler(async (req, res) => {
  const jobs = await Job.find({ moduleId: MODULE_ID }).sort({ createdAt: -1 }).limit(50)
  res.json({ jobs })
})

export const exportXlsx = asyncHandler(async (req, res) => {
  const { jobId } = req.params
  const report = await Report.findOne({ jobId, moduleId: MODULE_ID, type: REPORT_TYPE.XLSX }).sort({ createdAt: -1 })
  if (!report || !fs.existsSync(report.filePath)) {
    res.status(404)
    throw new Error('Report is not ready yet.')
  }
  res.download(report.filePath, `fc-financial-monitor-${jobId}.xlsx`)
})

export const exportCsv = asyncHandler(async (req, res) => {
  const { jobId } = req.params
  const report = await Report.findOne({ jobId, moduleId: MODULE_ID, type: REPORT_TYPE.CSV }).sort({ createdAt: -1 })
  if (!report || !fs.existsSync(report.filePath)) {
    res.status(404)
    throw new Error('Report is not ready yet.')
  }
  res.download(report.filePath, `fc-financial-monitor-${jobId}.csv`)
})
