import Job, { JOB_STATUS } from '../models/Job.js'
import { createNotification } from './notificationService.js'
import { NOTIFICATION_SEVERITY, NOTIFICATION_TYPE } from '../models/Notification.js'

// None of the three Python services run under a task queue with its own
// timeout/retry policy — each is a synchronous FastAPI BackgroundTask, so
// a hung external call (OCR, Gemini, SMTP) has nothing upstream to cap it.
// This is the platform-wide safety net: a job stuck in
// PROCESSING/QUEUED/PENDING for longer than any real batch should ever
// take is forced to FAILED rather than haunting the UI as "processing"
// forever.
const STALE_THRESHOLD_MS = parseInt(process.env.JOB_STALE_TIMEOUT_MINUTES || '30', 10) * 60 * 1000
const SWEEP_INTERVAL_MS = 60 * 1000

async function sweepOnce() {
  const cutoff = new Date(Date.now() - STALE_THRESHOLD_MS)
  const staleJobs = await Job.find({
    status: { $in: [JOB_STATUS.PENDING, JOB_STATUS.QUEUED, JOB_STATUS.PROCESSING] },
    updatedAt: { $lt: cutoff },
  })

  for (const job of staleJobs) {
    job.status = JOB_STATUS.FAILED
    job.error = {
      message: `Processing timed out — no progress for over ${STALE_THRESHOLD_MS / 60000} minutes.`,
      details: { lastStage: job.currentStage || null, lastProgress: job.progressPercentage },
    }
    await job.save()

    if (job.userId) {
      await createNotification({
        userId: job.userId,
        moduleId: job.moduleId,
        type: NOTIFICATION_TYPE.PROCESSING_FAILED,
        severity: NOTIFICATION_SEVERITY.CRITICAL,
        title: 'Processing timed out',
        message: `A ${job.moduleId} job (${job._id}) stopped making progress and was marked failed after exceeding the processing time limit.`,
        jobId: job._id,
        dedupeKey: `job-timeout:${job._id}`,
      })
    }
  }
}

export function startStaleJobSweeper() {
  setInterval(() => {
    sweepOnce().catch((err) => console.error('Stale job sweep failed:', err.message))
  }, SWEEP_INTERVAL_MS)
}
