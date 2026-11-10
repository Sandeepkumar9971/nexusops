import { Fragment, useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { History, Download, RotateCw, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import Card from '../components/common/Card'
import EmptyState from '../components/common/EmptyState'
import ErrorState from '../components/common/ErrorState'
import Spinner from '../components/common/Spinner'
import Button from '../components/common/Button'
import StatusBadge from '../components/common/StatusBadge'
import SearchInput from '../components/common/SearchInput'
import FilterSelect from '../components/common/FilterSelect'
import { useToast } from '../app/providers/ToastProvider'
import { listJobs, retryJob, getReportDownloadUrl } from '../services/jobsApi'
import { getJobResultLink } from '../utils/jobLinks'

const MODULE_OPTIONS = [
  { value: 'parcel-intelligence', label: 'Parcel Image Intelligence' },
  { value: 'employee-compliance', label: 'Employee Compliance' },
  { value: 'fc-financial-monitor', label: 'FC Financial Monitor' },
]
const STATUS_OPTIONS = ['PENDING', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'PARTIALLY_COMPLETED']
const RETRYABLE = new Set(['FAILED', 'PARTIALLY_COMPLETED'])
const PAGE_SIZE = 20

function formatDuration(job) {
  if (!job.completedAt) return '—'
  const ms = new Date(job.completedAt).getTime() - new Date(job.createdAt).getTime()
  if (ms < 1000) return '<1s'
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  return `${minutes}m ${seconds % 60}s`
}

export default function ProcessingHistoryPage() {
  const navigate = useNavigate()
  const { notify } = useToast()
  const [jobs, setJobs] = useState(null)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [moduleId, setModuleId] = useState('')
  const [status, setStatus] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [retryingId, setRetryingId] = useState(null)
  const [expandedError, setExpandedError] = useState(null)

  const load = useCallback(() => {
    setJobs(null)
    setError(null)
    listJobs({
      search: search || undefined,
      moduleId: moduleId || undefined,
      status: status || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page,
      limit: PAGE_SIZE,
    })
      .then((data) => {
        setJobs(data.jobs)
        setTotal(data.total)
      })
      .catch(() => setError('Could not load processing history. Is the Node API running?'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, moduleId, status, dateFrom, dateTo, page])

  useEffect(() => {
    load()
  }, [load])

  // Any filter change resets to page 1 — staying on page 3 of a now much
  // shorter filtered list would just show an empty page.
  useEffect(() => {
    setPage(1)
  }, [search, moduleId, status, dateFrom, dateTo])

  const handleRetry = async (job) => {
    setRetryingId(job._id)
    try {
      await retryJob(job._id)
      notify(`Job ${job._id} is processing again.`, { variant: 'success', title: 'Retry started' })
      load()
    } catch (err) {
      notify(err.response?.data?.error?.message || 'Failed to retry job.', { variant: 'error', title: 'Retry failed' })
    } finally {
      setRetryingId(null)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-6">
      <PageHeader title="Processing History" subtitle="Every batch across all three modules, in one place." />

      <div className="flex flex-wrap gap-3">
        <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by filename…" className="min-w-[220px] flex-1" />
        <FilterSelect value={moduleId} onChange={(e) => setModuleId(e.target.value)} options={MODULE_OPTIONS} placeholder="All modules" />
        <FilterSelect value={status} onChange={(e) => setStatus(e.target.value)} options={STATUS_OPTIONS} placeholder="All statuses" />
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 dark:border-navy-border dark:bg-navy-surface2 dark:text-slate-200"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 dark:border-navy-border dark:bg-navy-surface2 dark:text-slate-200"
        />
      </div>

      {error && <ErrorState title="Could not load processing history." description="Is the Node API running?" />}
      {!jobs && !error && <Spinner label="Loading processing history…" />}

      {jobs && jobs.length === 0 && (
        <EmptyState icon={History} title="No jobs match these filters." description="Process a batch in any module to see it here." />
      )}

      {jobs && jobs.length > 0 && (
        <>
          <Card padding="none" className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200/80 bg-slate-50/60 text-xs uppercase tracking-wide text-slate-400 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Module</th>
                  <th className="px-4 py-3 font-semibold">Job ID</th>
                  <th className="px-4 py-3 font-semibold">File(s)</th>
                  <th className="px-4 py-3 font-semibold">Submitted</th>
                  <th className="px-4 py-3 font-semibold">By</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Duration</th>
                  <th className="px-4 py-3 font-semibold" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {jobs.map((job) => (
                  <Fragment key={job._id}>
                    <tr className="transition-colors hover:bg-slate-50/80 dark:hover:bg-white/[0.03]">
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{job.moduleId}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">{job._id}</td>
                      <td className="max-w-[220px] truncate px-4 py-3 text-slate-600 dark:text-slate-400" title={job.inputFiles?.join(', ')}>
                        {job.inputFiles?.join(', ') || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{new Date(job.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{job.userId?.name || job.userId?.email || '—'}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={job.status} />
                      </td>
                      <td className="px-4 py-3 tabular-nums text-slate-500 dark:text-slate-400">{formatDuration(job)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {job.error?.message && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="px-0 text-red-600 hover:bg-transparent hover:underline dark:text-red-400"
                              onClick={() => setExpandedError(expandedError === job._id ? null : job._id)}
                            >
                              <AlertTriangle size={12} /> Error
                            </Button>
                          )}
                          {getJobResultLink(job) && ['COMPLETED', 'PARTIALLY_COMPLETED', 'FAILED'].includes(job.status) && (
                            <Button variant="ghost" size="sm" className="px-0 hover:bg-transparent hover:underline" onClick={() => navigate(getJobResultLink(job))}>
                              Open
                            </Button>
                          )}
                          {job.reports?.map((report) => (
                            <Button key={report._id} as="a" href={getReportDownloadUrl(report._id)} variant="ghost" size="sm" className="px-0 hover:bg-transparent hover:underline">
                              <Download size={12} /> {report.type.toUpperCase()}
                            </Button>
                          ))}
                          {RETRYABLE.has(job.status) && (
                            <Button variant="secondary" size="sm" loading={retryingId === job._id} onClick={() => handleRetry(job)}>
                              <RotateCw size={12} /> Retry
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedError === job._id && job.error?.message && (
                      <tr>
                        <td colSpan={8} className="bg-red-50/60 px-4 py-2 text-xs text-red-700 dark:bg-red-500/5 dark:text-red-300">
                          {job.error.message}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </Card>

          <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
            <p>
              {total} job{total === 1 ? '' : 's'} total
            </p>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft size={14} /> Prev
              </Button>
              <span>
                Page {page} of {totalPages}
              </span>
              <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
