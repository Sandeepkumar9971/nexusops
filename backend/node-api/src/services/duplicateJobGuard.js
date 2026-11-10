import Job, { JOB_STATUS } from '../models/Job.js'

const DEDUPE_WINDOW_MS = 10 * 1000
const ACTIVE_STATUSES = [JOB_STATUS.PENDING, JOB_STATUS.QUEUED, JOB_STATUS.PROCESSING]

// A double-click or a slow network causing a browser retry shouldn't spin
// up two identical batches — if the exact same user submitted the exact
// same set of filenames for the exact same module in the last few
// seconds and that job is still active, hand back the existing job
// instead of creating (and triggering Python processing for) a new one.
// The newly-uploaded duplicate file on disk is left orphaned (harmless,
// cleaned up like any other abandoned upload) — simpler than restructuring
// upload middleware to check before writing the file at all.
export async function findRecentDuplicateJob({ moduleId, userId, inputFiles }) {
  if (!userId) return null
  const since = new Date(Date.now() - DEDUPE_WINDOW_MS)
  return Job.findOne({
    moduleId,
    userId,
    status: { $in: ACTIVE_STATUSES },
    createdAt: { $gte: since },
    inputFiles: { $size: inputFiles.length, $all: inputFiles },
  }).sort({ createdAt: -1 })
}
