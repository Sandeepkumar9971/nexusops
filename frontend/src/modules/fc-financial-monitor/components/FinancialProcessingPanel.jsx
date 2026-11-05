import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, AlertTriangle, Check } from 'lucide-react'
import { getJobStatus, getExportXlsxUrl, getExportCsvUrl } from '../services/fcFinancialApi'
import StatusBadge from '../../../components/common/StatusBadge'
import Card from '../../../components/common/Card'
import Button from '../../../components/common/Button'
import ErrorState from '../../../components/common/ErrorState'
import { PROCESSING_STAGES } from '../constants'

const POLL_INTERVAL_MS = 3000
const TERMINAL_STATUSES = ['COMPLETED', 'PARTIALLY_COMPLETED', 'FAILED']

function Stat({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-400 dark:text-slate-500">{label}</p>
      <p className="text-lg font-semibold text-slate-900 tabular-nums dark:text-slate-50">{value}</p>
    </div>
  )
}

function StageList({ currentStage, isTerminal, failed }) {
  const currentIndex = PROCESSING_STAGES.indexOf(currentStage)

  return (
    <ol className="space-y-1.5">
      {PROCESSING_STAGES.map((stage, idx) => {
        const isDone = isTerminal ? !failed : currentIndex > idx || (currentIndex === idx && idx === PROCESSING_STAGES.length - 1)
        const isCurrent = !isTerminal && currentIndex === idx
        return (
          <li key={stage} className="flex items-center gap-2 text-sm">
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                isDone
                  ? 'bg-green-100 text-green-600 dark:bg-green-500/15 dark:text-green-400'
                  : isCurrent
                    ? 'bg-indigo-100 text-indigo-600 dark:bg-blue-500/15 dark:text-blue-400'
                    : 'bg-slate-100 text-slate-300 dark:bg-white/5 dark:text-slate-600'
              }`}
            >
              {isDone ? <Check size={12} /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
            </span>
            <span
              className={
                isCurrent
                  ? 'font-medium text-slate-900 dark:text-slate-50'
                  : isDone
                    ? 'text-slate-500 dark:text-slate-400'
                    : 'text-slate-400 dark:text-slate-600'
              }
            >
              {stage}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

export default function FinancialProcessingPanel({ jobId, onStartNew }) {
  const [job, setJob] = useState(null)
  const [error, setError] = useState(null)

  // Polls job status; stops once the job reaches a terminal state. Leaving
  // this screen and coming back later re-mounts the component with the
  // same jobId (persisted by the parent page), so polling simply resumes.
  useEffect(() => {
    let cancelled = false
    let timer

    const poll = async () => {
      try {
        const data = await getJobStatus(jobId)
        if (cancelled) return
        setJob(data)
        setError(null)
        if (!TERMINAL_STATUSES.includes(data.status)) {
          timer = setTimeout(poll, POLL_INTERVAL_MS)
        }
      } catch (err) {
        if (cancelled) return
        if (err.response?.status === 404) {
          setError('This batch no longer exists.')
          return
        }
        setError('Could not load batch status. Is the Node API running?')
        timer = setTimeout(poll, POLL_INTERVAL_MS)
      }
    }

    poll()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [jobId])

  if (error) {
    return (
      <ErrorState
        title={error}
        action={
          <Button variant="danger" size="sm" onClick={onStartNew}>
            Start a new upload
          </Button>
        }
      />
    )
  }

  if (!job) {
    return (
      <Card className="flex items-center justify-center">
        <p className="text-sm text-slate-400 dark:text-slate-500">Loading batch…</p>
      </Card>
    )
  }

  const isTerminal = TERMINAL_STATUSES.includes(job.status)
  const failed = job.status === 'FAILED'

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">Job ID</p>
            <p className="font-mono text-sm text-slate-700 dark:text-slate-300">{job._id}</p>
          </div>
          <StatusBadge status={job.status} />
        </div>

        {failed && job.error?.message && (
          <p className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            <AlertTriangle size={14} className="shrink-0" />
            {job.error.message}
          </p>
        )}

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-[1fr_auto]">
          <StageList currentStage={job.currentStage} isTerminal={isTerminal} failed={failed} />
          <div className="grid grid-cols-2 gap-4 sm:gap-6">
            <Stat label="Total Records" value={job.totalRecords} />
            <Stat label="Processed" value={job.processedRecords} />
          </div>
        </div>

        <Button variant="ghost" size="sm" onClick={onStartNew} className="px-0 hover:bg-transparent hover:underline">
          Start a new upload
        </Button>
      </Card>

      {isTerminal && !failed && (
        <Card className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Processing complete</h2>
          {job.summary && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              <Stat label="Total FCs" value={job.summary.totalFCs} />
              <Stat label="Avg CM1 %" value={job.summary.averageCm1Percentage != null ? `${job.summary.averageCm1Percentage}%` : '—'} />
              <Stat label="Avg CM2 %" value={job.summary.averageCm2Percentage != null ? `${job.summary.averageCm2Percentage}%` : '—'} />
              <Stat label="Anomalies" value={job.summary.totalAnomalies} />
              <Stat
                label="Red FCs"
                value={job.summary.statusCounts?.RED ?? 0}
              />
            </div>
          )}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button as={Link} to="/modules/fc-financial" size="sm">
              View FC Performance Dashboard
            </Button>
            <Button as="a" href={getExportXlsxUrl(jobId)} variant="secondary" size="sm">
              <Download size={14} /> Export Excel Report
            </Button>
            <Button as="a" href={getExportCsvUrl(jobId)} variant="secondary" size="sm">
              <Download size={14} /> Export CSV
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
