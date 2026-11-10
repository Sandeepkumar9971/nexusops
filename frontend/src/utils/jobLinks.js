// Where "Open results" in Processing History should navigate for a given
// job — each module's workflow page already supports loading a specific
// past job via a :jobId/:batchId route param (reused here, not duplicated).
export function getJobResultLink(job) {
  switch (job.moduleId) {
    case 'parcel-intelligence':
      return `/modules/parcel-intelligence/batches/${job._id}`
    case 'employee-compliance':
      return `/modules/compliance/batches/${job._id}`
    case 'fc-financial-monitor':
      return `/modules/fc-financial/batches/${job._id}`
    default:
      return null
  }
}
