import Job from '../../models/Job.js'

// This dashboard's KPI labels ("Images Processed", "Extractions") and the
// "Images" column in Recent Processing Activity were written when Parcel
// Intelligence was the only module. Scoped here on purpose: Employee
// Compliance counts "employees", not "images", and mixing the two into
// these totals would silently corrupt a label that's already specific.
// Employee Compliance gets its own dashboard (GET /employee-compliance/dashboard)
// with its own correctly-labeled KPIs instead.
const PARCEL_MODULE_ID = 'parcel-intelligence'

function formatJobSummary(job) {
  const [firstFile, ...rest] = job.inputFiles || []
  const uploadedFileName = firstFile ? (rest.length ? `${firstFile} +${rest.length} more` : firstFile) : '—'

  return {
    id: job._id.toString(),
    moduleId: job.moduleId,
    uploadedFileName,
    totalImages: job.totalRecords,
    status: job.status,
    createdAt: job.createdAt,
  }
}

export async function getDashboardSummary() {
  const moduleFilter = { moduleId: PARCEL_MODULE_ID }
  const [imagesAgg, successAgg, failedAgg, totalProcessingJobs, recentJobsDocs] = await Promise.all([
    Job.aggregate([{ $match: moduleFilter }, { $group: { _id: null, total: { $sum: '$totalRecords' } } }]),
    Job.aggregate([{ $match: moduleFilter }, { $group: { _id: null, total: { $sum: '$successfulRecords' } } }]),
    Job.aggregate([{ $match: moduleFilter }, { $group: { _id: null, total: { $sum: '$failedRecords' } } }]),
    Job.countDocuments(moduleFilter),
    Job.find(moduleFilter).sort({ createdAt: -1 }).limit(5),
  ])

  return {
    totalImagesProcessed: imagesAgg[0]?.total || 0,
    successfulExtractions: successAgg[0]?.total || 0,
    failedExtractions: failedAgg[0]?.total || 0,
    totalProcessingJobs,
    recentJobs: recentJobsDocs.map(formatJobSummary),
  }
}
