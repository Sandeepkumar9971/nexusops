import fs from 'fs'
import path from 'path'
import Job, { JOB_STATUS } from '../../models/Job.js'
import ParcelResult from '../../models/ParcelResult.js'
import Report, { REPORT_TYPE } from '../../models/Report.js'
import { asyncHandler } from '../../middleware/asyncHandler.js'
import pythonAiClient from '../../services/pythonAiClient.js'
import { UPLOAD_ROOT } from '../../config/paths.js'
import { toCsv } from '../../services/csvService.js'

const CSV_COLUMNS = [
  { header: 'Filename', value: (r) => r.filename },
  { header: 'Status', value: (r) => r.status },
  { header: 'AWB', value: (r) => r.fields?.awb },
  { header: 'Location', value: (r) => r.fields?.location },
  { header: 'Weight (kg)', value: (r) => r.fields?.weight },
  { header: 'Length (cm)', value: (r) => r.fields?.length },
  { header: 'Width (cm)', value: (r) => r.fields?.width },
  { header: 'Height (cm)', value: (r) => r.fields?.height },
  { header: 'Volume (cm3)', value: (r) => r.fields?.volume },
  { header: 'Timestamp', value: (r) => r.fields?.timestamp },
  { header: 'Sorter ID', value: (r) => r.fields?.sorterId },
  { header: 'Extraction Method', value: (r) => r.extractionMethod },
  { header: 'OCR Confidence', value: (r) => r.ocrConfidence },
  { header: 'Error Reason', value: (r) => r.errorReason },
]

// Rejects path-traversal attempts (e.g. "../../etc/passwd") in URL
// segments that get joined into a filesystem path below.
function isSafePathSegment(segment) {
  return typeof segment === 'string' && segment.length > 0 && !/[./\\]{2,}|[/\\]/.test(segment)
}

export const createJob = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    res.status(400)
    throw new Error('At least one image is required.')
  }

  const job = await Job.create({
    _id: req.uploadBatchId,
    moduleId: 'parcel-intelligence',
    inputFiles: req.files.map((file) => file.filename),
    totalRecords: req.files.length,
    status: JOB_STATUS.PENDING,
  })

  try {
    await pythonAiClient.post('/process-job', {
      job_id: job._id.toString(),
      file_paths: job.inputFiles,
    })
  } catch (err) {
    // Job stays PENDING if Python is unreachable — Phase 9 adds proper
    // retry/queueing. Upload itself still succeeded, so we don't fail the response.
    console.error('Failed to trigger Python AI processing:', err.message)
  }

  res.status(201).json({ job })
})

export const listResults = asyncHandler(async (req, res) => {
  const results = await ParcelResult.find({ jobId: req.params.jobId }).sort({ createdAt: 1 })
  res.json({ results })
})

export const exportCsv = asyncHandler(async (req, res) => {
  const { jobId } = req.params
  const results = await ParcelResult.find({ jobId }).sort({ createdAt: 1 })

  if (results.length === 0) {
    res.status(404)
    throw new Error('No results found for this job.')
  }

  const csvContent = toCsv(results, CSV_COLUMNS)

  const reportDir = path.join(UPLOAD_ROOT, 'reports', 'parcel-intelligence')
  fs.mkdirSync(reportDir, { recursive: true })
  const reportPath = path.join(reportDir, `${jobId}.csv`)
  fs.writeFileSync(reportPath, csvContent)

  // Upsert so re-exporting the same job updates one report record instead
  // of accumulating a new one every time the button is clicked.
  await Report.findOneAndUpdate(
    { jobId, moduleId: 'parcel-intelligence', type: REPORT_TYPE.CSV },
    { filePath: reportPath },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  )

  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', `attachment; filename="parcel-intelligence-${jobId}.csv"`)
  res.send(csvContent)
})

export const serveImage = asyncHandler(async (req, res) => {
  const { jobId, filename } = req.params
  if (!isSafePathSegment(jobId) || !isSafePathSegment(filename)) {
    res.status(400)
    throw new Error('Invalid path segment.')
  }

  const filePath = path.join(UPLOAD_ROOT, 'parcel-intelligence', jobId, filename)
  res.sendFile(filePath, (err) => {
    if (err && !res.headersSent) {
      res.status(404).json({ success: false, error: { message: 'Image not found' } })
    }
  })
})
