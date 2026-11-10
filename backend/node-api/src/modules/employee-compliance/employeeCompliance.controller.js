import fs from 'fs'
import Job, { JOB_STATUS } from '../../models/Job.js'
import ComplianceEmployeeResult, { VERIFICATION_STATUS } from '../../models/ComplianceEmployeeResult.js'
import Report, { REPORT_TYPE } from '../../models/Report.js'
import { asyncHandler } from '../../middleware/asyncHandler.js'
import pythonAiClient from '../../services/pythonAiClient.js'
import { findRecentDuplicateJob } from '../../services/duplicateJobGuard.js'

const MODULE_ID = 'employee-compliance'
const MISMATCH_STATUSES = [
  VERIFICATION_STATUS.NAME_MISMATCH,
  VERIFICATION_STATUS.AMOUNT_MISMATCH,
  VERIFICATION_STATUS.MISSING,
]

export const createBatch = asyncHandler(async (req, res) => {
  const wagesheetFile = req.files.wagesheet[0]
  const pfEcrFile = req.files.pfEcr[0]
  const esicEcrFile = req.files.esicEcr[0]
  const inputFiles = [wagesheetFile.filename, pfEcrFile.filename, esicEcrFile.filename]

  const duplicate = await findRecentDuplicateJob({ moduleId: MODULE_ID, userId: req.user.id, inputFiles })
  if (duplicate) {
    res.status(200).json({ job: duplicate, deduplicated: true })
    return
  }

  const job = await Job.create({
    _id: req.uploadBatchId,
    moduleId: MODULE_ID,
    userId: req.user.id,
    inputFiles,
    status: JOB_STATUS.PENDING,
  })

  try {
    await pythonAiClient.post('/process-compliance-batch', {
      job_id: job._id.toString(),
      wagesheet_filename: wagesheetFile.filename,
      pf_ecr_filename: pfEcrFile.filename,
      esic_ecr_filename: esicEcrFile.filename,
    })
  } catch (err) {
    // Job stays PENDING if Python is unreachable — same fallback behavior
    // as parcel-intelligence; the upload itself still succeeded.
    console.error('Failed to trigger Python compliance processing:', err.message)
  }

  res.status(201).json({ job })
})

export const listResults = asyncHandler(async (req, res) => {
  const results = await ComplianceEmployeeResult.find({ jobId: req.params.jobId }).sort({ createdAt: 1 })
  res.json({ results })
})

export const exportXlsx = asyncHandler(async (req, res) => {
  const { jobId } = req.params
  // Python generates the actual workbook as the pipeline's final stage
  // (openpyxl needs the rich in-memory comparison data it already has) —
  // this just serves whatever it produced, via the shared Report record.
  const report = await Report.findOne({ jobId, moduleId: MODULE_ID, type: REPORT_TYPE.XLSX }).sort({
    createdAt: -1,
  })
  if (!report || !fs.existsSync(report.filePath)) {
    res.status(404)
    throw new Error('Report is not ready yet.')
  }
  res.download(report.filePath, `employee-compliance-${jobId}.xlsx`)
})

function formatBatchSummary(job) {
  return {
    id: job._id.toString(),
    status: job.status,
    currentStage: job.currentStage,
    totalEmployees: job.totalRecords,
    processedEmployees: job.processedRecords,
    createdAt: job.createdAt,
    completedAt: job.completedAt,
  }
}

export const getDashboardSummary = asyncHandler(async (req, res) => {
  const [totalBatches, totalEmployeesAgg, recentBatchDocs, pfMismatch, esicMismatch, needsReview] =
    await Promise.all([
      Job.countDocuments({ moduleId: MODULE_ID }),
      Job.aggregate([{ $match: { moduleId: MODULE_ID } }, { $group: { _id: null, total: { $sum: '$totalRecords' } } }]),
      Job.find({ moduleId: MODULE_ID }).sort({ createdAt: -1 }).limit(5),
      ComplianceEmployeeResult.countDocuments({ moduleId: MODULE_ID, 'pf.status': { $in: MISMATCH_STATUSES } }),
      ComplianceEmployeeResult.countDocuments({ moduleId: MODULE_ID, 'esic.status': { $in: MISMATCH_STATUSES } }),
      ComplianceEmployeeResult.countDocuments({
        moduleId: MODULE_ID,
        $or: [{ 'pf.status': VERIFICATION_STATUS.NEEDS_REVIEW }, { 'esic.status': VERIFICATION_STATUS.NEEDS_REVIEW }],
      }),
    ])

  const matchedEmployees = await ComplianceEmployeeResult.countDocuments({
    moduleId: MODULE_ID,
    'pf.status': VERIFICATION_STATUS.MATCHED,
    'esic.status': VERIFICATION_STATUS.MATCHED,
  })

  const totalEmployees = totalEmployeesAgg[0]?.total || 0

  res.json({
    totalBatches,
    totalEmployees,
    matchedEmployees,
    needsAttention: Math.max(totalEmployees - matchedEmployees, 0),
    pfMismatchCount: pfMismatch,
    esicMismatchCount: esicMismatch,
    needsReviewCount: needsReview,
    recentBatches: recentBatchDocs.map(formatBatchSummary),
  })
})
