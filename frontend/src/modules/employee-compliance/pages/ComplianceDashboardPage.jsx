import { Link } from 'react-router-dom'
import { AlertTriangle, Users, CheckCircle2, ShieldAlert, Inbox } from 'lucide-react'
import PageHeader from '../../../components/common/PageHeader'
import Button from '../../../components/common/Button'
import Card from '../../../components/common/Card'
import KpiCard from '../../../components/dashboard/KpiCard'
import EmptyState from '../../../components/common/EmptyState'
import Spinner from '../../../components/common/Spinner'
import StatusBadge from '../../../components/common/StatusBadge'
import { useComplianceDashboard } from '../hooks/useComplianceDashboard'

export default function ComplianceDashboardPage() {
  const { status, data } = useComplianceDashboard()
  const loading = status === 'loading'

  const kpis = [
    { label: 'Total Batches', value: data.totalBatches, icon: Inbox, accent: 'slate' },
    { label: 'Total Employees', value: data.totalEmployees, icon: Users, accent: 'indigo' },
    { label: 'Matched Employees', value: data.matchedEmployees, icon: CheckCircle2, accent: 'green' },
    { label: 'Needs Attention', value: data.needsAttention, icon: ShieldAlert, accent: 'red' },
  ]

  return (
    <div className="space-y-8">
      <PageHeader
        title="Employee Compliance Verification"
        subtitle="Verify vendor wagesheet deductions against PF and ESIC ECR filings."
        actions={
          <Button as={Link} to="/modules/compliance/new">
            Start New Verification
          </Button>
        }
      />

      {status === 'error' && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>Couldn't reach the backend API. Showing zero values until the connection is restored.</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} loading={loading} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card padding="sm">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">PF Mismatches</p>
          <p className="mt-2 text-2xl font-semibold text-orange-600 tabular-nums dark:text-orange-400">{loading ? '—' : data.pfMismatchCount}</p>
        </Card>
        <Card padding="sm">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">ESIC Mismatches</p>
          <p className="mt-2 text-2xl font-semibold text-orange-600 tabular-nums dark:text-orange-400">{loading ? '—' : data.esicMismatchCount}</p>
        </Card>
        <Card padding="sm">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Needs Review</p>
          <p className="mt-2 text-2xl font-semibold text-amber-600 tabular-nums dark:text-amber-400">{loading ? '—' : data.needsReviewCount}</p>
        </Card>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Recent Batches</h2>
        {loading ? (
          <Card padding="lg" className="flex items-center justify-center">
            <Spinner label="Loading recent batches…" />
          </Card>
        ) : data.recentBatches.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No verification batches yet."
            action={
              <Button as={Link} to="/modules/compliance/new" variant="ghost" size="sm">
                Start your first verification →
              </Button>
            }
          />
        ) : (
          <Card padding="none" className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200/80 bg-slate-50/60 text-xs uppercase tracking-wide text-slate-400 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Batch ID</th>
                  <th className="px-4 py-3 font-semibold">Employees</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                  <th className="px-4 py-3 font-semibold" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {data.recentBatches.map((batch) => (
                  <tr key={batch.id} className="transition-colors hover:bg-slate-50/80 dark:hover:bg-white/[0.03]">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">{batch.id}</td>
                    <td className="px-4 py-3 text-slate-700 tabular-nums dark:text-slate-300">
                      {batch.processedEmployees} / {batch.totalEmployees}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={batch.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{new Date(batch.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/modules/compliance/batches/${batch.id}`}
                        className="font-medium text-indigo-600 hover:underline dark:text-blue-400"
                      >
                        View Results
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>
    </div>
  )
}
