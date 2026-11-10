import Job from '../../models/Job.js'
import { asyncHandler } from '../../middleware/asyncHandler.js'
import { createNotification } from '../../services/notificationService.js'

// Called only by the Python AI service, right after it finishes (or
// partway through, for a per-anomaly critical alert) processing a job —
// never by the browser. Resolves userId from the job itself so Python
// never needs to know about Node's User model.
export const createInternalNotification = asyncHandler(async (req, res) => {
  const { jobId, moduleId, type, severity, title, message, relatedEntity, dedupeKey } = req.body
  if (!jobId || !moduleId || !type || !severity || !title || !message || !dedupeKey) {
    res.status(400)
    throw new Error('jobId, moduleId, type, severity, title, message, and dedupeKey are required.')
  }

  const job = await Job.findById(jobId)
  if (!job) {
    res.status(404)
    throw new Error('Job not found.')
  }

  const notification = await createNotification({
    userId: job.userId,
    moduleId,
    type,
    severity,
    title,
    message,
    jobId,
    relatedEntity,
    dedupeKey,
  })
  res.status(201).json({ notification })
})
