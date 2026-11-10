import Job, { JOB_STATUS } from '../models/Job.js'
import ParcelResult from '../models/ParcelResult.js'
import ComplianceEmployeeResult from '../models/ComplianceEmployeeResult.js'
import FCDailyFinancial from '../models/FCDailyFinancial.js'
import FinancialAnomaly from '../models/FinancialAnomaly.js'
import pythonAiClient from './pythonAiClient.js'

// "Safe" retry = only ever for a job already in a terminal failure state,
// never one still PROCESSING/QUEUED (that would race the still-running
// attempt), and always starting from a clean slate — each module's
// service.py only ever INSERTs result rows, it never clears a prior
// partial run for the same job id, so a retry that skipped this step
// would leave duplicate rows behind every time.
const RETRYABLE_STATUSES = [JOB_STATUS.FAILED, JOB_STATUS.PARTIALLY_COMPLETED]

async function clearPriorResults(job) {
  switch (job.moduleId) {
    case 'parcel-intelligence':
      await ParcelResult.deleteMany({ jobId: job._id })
      break
    case 'employee-compliance':
      await ComplianceEmployeeResult.deleteMany({ jobId: job._id })
      break
    case 'fc-financial-monitor':
      await FCDailyFinancial.deleteMany({ jobId: job._id })
      await FinancialAnomaly.deleteMany({ jobId: job._id })
      break
    default:
      break
  }
}

async function triggerProcessing(job) {
  const jobId = job._id.toString()
  switch (job.moduleId) {
    case 'parcel-intelligence':
      return pythonAiClient.post('/process-job', { job_id: jobId, file_paths: job.inputFiles })
    case 'employee-compliance': {
      const [wagesheetFilename, pfEcrFilename, esicEcrFilename] = job.inputFiles
      return pythonAiClient.post('/process-compliance-batch', {
        job_id: jobId,
        wagesheet_filename: wagesheetFilename,
        pf_ecr_filename: pfEcrFilename,
        esic_ecr_filename: esicEcrFilename,
      })
    }
    case 'fc-financial-monitor':
      // A retry can't recover a manual column-mapping/default-FC-name
      // override from the original request (those were never persisted
      // on the Job) — it re-runs with auto-detection, which reproduces
      // the original result for any file that didn't need an override.
      return pythonAiClient.post('/process-financial-batch', {
        job_id: jobId,
        filename: job.inputFiles[0],
        column_mapping: null,
        default_fc_name: null,
      })
    default:
      throw new Error(`Retry is not supported for module "${job.moduleId}".`)
  }
}

export async function retryJob(jobId) {
  const job = await Job.findById(jobId)
  if (!job) {
    const err = new Error('Job not found.')
    err.statusCode = 404
    throw err
  }
  if (!RETRYABLE_STATUSES.includes(job.status)) {
    const err = new Error(`Only a ${RETRYABLE_STATUSES.join(' or ')} job can be retried (this job is ${job.status}).`)
    err.statusCode = 400
    throw err
  }

  await clearPriorResults(job)

  job.status = JOB_STATUS.PENDING
  job.processedRecords = 0
  job.successfulRecords = 0
  job.failedRecords = 0
  job.progressPercentage = 0
  job.currentStage = undefined
  job.error = undefined
  job.completedAt = undefined
  await job.save()

  try {
    await triggerProcessing(job)
  } catch (err) {
    console.error(`Failed to trigger retry for job ${jobId}:`, err.message)
  }

  return job
}
