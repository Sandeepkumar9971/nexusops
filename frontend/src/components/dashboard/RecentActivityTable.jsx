import { Link } from 'react-router-dom'
import { Inbox } from 'lucide-react'
import StatusBadge from '../common/StatusBadge'
import Card from '../common/Card'
import EmptyState from '../common/EmptyState'
import Spinner from '../common/Spinner'
import Button from '../common/Button'

export default function RecentActivityTable({ jobs, loading }) {
  if (loading) {
    return (
      <Card padding="lg" className="flex items-center justify-center">
        <Spinner label="Loading recent activity…" />
      </Card>
    )
  }

  if (!jobs || jobs.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No processing jobs yet."
        action={
          <Button as={Link} to="/modules/parcel-intelligence" variant="ghost" size="sm">
            Start your first job in Parcel Image Intelligence →
          </Button>
        }
      />
    )
  }

  return (
    <Card padding="none" className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200/80 bg-slate-50/60 text-xs uppercase tracking-wide text-slate-400 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-500">
          <tr>
            <th className="px-4 py-3 font-semibold">Job ID</th>
            <th className="px-4 py-3 font-semibold">Uploaded File</th>
            <th className="px-4 py-3 font-semibold">Images</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Created</th>
            <th className="px-4 py-3 font-semibold" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
          {jobs.map((job) => (
            <tr key={job.id} className="transition-colors hover:bg-slate-50/80 dark:hover:bg-white/[0.03]">
              <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">{job.id}</td>
              <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{job.uploadedFileName}</td>
              <td className="px-4 py-3 text-slate-700 tabular-nums dark:text-slate-300">{job.totalImages}</td>
              <td className="px-4 py-3">
                <StatusBadge status={job.status} />
              </td>
              <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{new Date(job.createdAt).toLocaleString()}</td>
              <td className="px-4 py-3 text-right">
                <Link to="/history" className="font-medium text-indigo-600 hover:text-indigo-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300">
                  View Results
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}
