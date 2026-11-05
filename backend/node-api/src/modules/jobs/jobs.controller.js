import Job from '../../models/Job.js'
import { asyncHandler } from '../../middleware/asyncHandler.js'

export const listJobs = asyncHandler(async (req, res) => {
  const { moduleId } = req.query
  const filter = moduleId ? { moduleId } : {}
  const jobs = await Job.find(filter).sort({ createdAt: -1 })
  res.json({ jobs })
})

export const getJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id)
  if (!job) {
    res.status(404)
    throw new Error('Job not found')
  }
  res.json({ job })
})
