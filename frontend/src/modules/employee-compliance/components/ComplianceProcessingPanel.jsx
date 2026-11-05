import { useEffect, useState } from 'react'
import { Download, AlertTriangle, Check } from 'lucide-react'
import { getJobStatus, getBatchResults, getExportUrl } from '../services/employeeComplianceApi'
import StatusBadge from '../../../components/common/StatusBadge'
import Card from '../../../components/common/Card'
import Button from '../../../components/common/Button'
import Spinner from '../../../components/common/Spinner'
import ErrorState from '../../../components/common/ErrorState'
import EmployeeResultsTable from './EmployeeResultsTable'
import ComplianceSummaryCards from './ComplianceSummaryCards'
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

export default function ComplianceProcessingPanel({ jobId, onStartNew }) {
  const [job, setJob] = useState(null)
  const [error, setError] = useState(null)
  const [results, setResults] = useState(null)
  const [resultsError, setResultsError] = useState(null)

  // Polls job status; stops once the job reaches a terminal state instead
  // of polling forever.
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
          return // permanent failure — no point retrying
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

  // Fetches results once (and only once) the job lands on a terminal status.
  useEffect(() => {
    if (!job || !TERMINAL_STATUSES.includes(job.status)) return undefined
    let cancelled = false

    getBatchResults(jobId)
      .then((data) => {
        if (!cancelled) setResults(data)
      })
      .catch(() => {
        if (!cancelled) setResultsError('Could not load results.')
      })

    return () => {
      cancelled = true
    }
  }, [job, jobId])

  if (error) {
    return (
      <ErrorState
        title={error}
        action={
          <Button variant="danger" size="sm" onClick={onStartNew}>
            Start a new verification
          </Button>
        }
      />
    )
  }

  if (!job) {
    return (
      <Card className="flex items-center justify-center">
        <Spinner label="Loading batch…" />
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
            <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">Batch ID</p>
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
            <Stat label="Total Employees" value={job.totalRecords} />
            <Stat label="Processed" value={job.processedRecords} />
          </div>
        </div>

        <Button variant="ghost" size="sm" onClick={onStartNew} className="px-0 hover:bg-transparent hover:underline">
          Start a new verification
        </Button>
      </Card>

      {isTerminal && !failed && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Results</h2>
            {results && results.length > 0 && (
              <Button as="a" href={getExportUrl(jobId)} variant="secondary" size="sm">
                <Download size={14} />
                Export Excel Report
              </Button>
            )}
          </div>

          {resultsError && (
            <p className="flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400">
              <AlertTriangle size={14} className="shrink-0" />
              {resultsError}
            </p>
          )}
          {!results && !resultsError && <Spinner label="Loading results…" />}
          {results && (
            <>
              <ComplianceSummaryCards results={results} />
              <EmployeeResultsTable results={results} />
            </>
          )}
        </div>
      )}
    </div>
  )
}
