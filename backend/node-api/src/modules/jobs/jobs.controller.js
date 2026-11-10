import Job from '../../models/Job.js'
import Report from '../../models/Report.js'
import { asyncHandler } from '../../middleware/asyncHandler.js'
import { retryJob } from '../../services/jobRetryService.js'

// Powers the Processing History Centre — one endpoint across all three
// modules' jobs, with the filters/search/pagination that page needs.
export const listJobs = asyncHandler(async (req, res) => {
  const { moduleId, status, search, dateFrom, dateTo, page = 1, limit = 25 } = req.query
  const filter = {}
  if (moduleId) filter.moduleId = moduleId
  if (status) filter.status = status
  if (search) filter.inputFiles = { $elemMatch: { $regex: search, $options: 'i' } }
  if (dateFrom || dateTo) {
    filter.createdAt = {}
    if (dateFrom) filter.createdAt.$gte = new Date(dateFrom)
    if (dateTo) filter.createdAt.$lte = new Date(`${dateTo}T23:59:59.999Z`)
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1)
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25))

  const [jobs, total] = await Promise.all([
    Job.find(filter)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Job.countDocuments(filter),
  ])

  // One lookup instead of N: every report for every job on this page,
  // grouped client-side-friendly as { [jobId]: [reports] }.
  const jobIds = jobs.map((j) => j._id)
  const reports = await Report.find({ jobId: { $in: jobIds } })
  const reportsByJobId = {}
  for (const report of reports) {
    const key = report.jobId.toString()
    reportsByJobId[key] = reportsByJobId[key] || []
    reportsByJobId[key].push(report)
  }

  res.json({
    jobs: jobs.map((job) => ({ ...job.toObject(), reports: reportsByJobId[job._id.toString()] || [] })),
    total,
    page: pageNum,
    limit: limitNum,
  })
})

export const getJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id).populate('userId', 'name email')
  if (!job) {
    res.status(404)
    throw new Error('Job not found')
  }
  res.json({ job })
})

export const retryJobHandler = asyncHandler(async (req, res) => {
  const job = await retryJob(req.params.id)
  res.json({ job })
})
