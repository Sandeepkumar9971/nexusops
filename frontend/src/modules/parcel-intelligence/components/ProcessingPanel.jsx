import { useEffect, useState } from 'react'
import { Download, AlertTriangle } from 'lucide-react'
import { getJobStatus, getJobResults } from '../services/parcelIntelligenceApi'
import StatusBadge from '../../../components/common/StatusBadge'
import Card from '../../../components/common/Card'
import Button from '../../../components/common/Button'
import Spinner from '../../../components/common/Spinner'
import ProgressBar from '../../../components/common/ProgressBar'
import ErrorState from '../../../components/common/ErrorState'
import ResultsTable from './ResultsTable'
import apiClient from '../../../services/apiClient'
import { getToken } from '../../../services/authStorage'

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

export default function ProcessingPanel({ jobId, onStartNew }) {
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
          setError('This job no longer exists.')
          return // permanent failure — no point retrying
        }
        setError('Could not load job status. Is the Node API running?')
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

    getJobResults(jobId)
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
            Start a new upload
          </Button>
        }
      />
    )
  }

  if (!job) {
    return (
      <Card className="flex items-center justify-center">
        <Spinner label="Loading job…" />
      </Card>
    )
  }

  const progress = job.totalRecords > 0 ? Math.round((job.processedRecords / job.totalRecords) * 100) : 0
  const isTerminal = TERMINAL_STATUSES.includes(job.status)

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

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Total Images" value={job.totalRecords} />
          <Stat label="Processed" value={job.processedRecords} />
          <Stat label="Successful" value={job.successfulRecords} />
          <Stat label="Failed" value={job.failedRecords} />
        </div>

        <ProgressBar value={progress} label={`${progress}% complete`} />

        {job.status === 'PENDING' && (
          <p className="text-xs text-slate-400 dark:text-slate-500">Waiting for the processing pipeline to pick this job up…</p>
        )}

        <Button variant="ghost" size="sm" onClick={onStartNew} className="px-0 hover:bg-transparent hover:underline">
          Start a new upload
        </Button>
      </Card>

      {isTerminal && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Results</h2>
            {results && results.length > 0 && (
              <Button
                as="a"
                href={`${apiClient.defaults.baseURL}/parcel-intelligence/jobs/${jobId}/export.csv?token=${getToken()}`}
                variant="secondary"
                size="sm"
              >
                <Download size={14} />
                Export CSV
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
          {results && <ResultsTable jobId={jobId} results={results} />}
        </div>
      )}
    </div>
  )
}
