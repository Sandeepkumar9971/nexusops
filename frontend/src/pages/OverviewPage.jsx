import { AlertTriangle, Image as ImageIcon, CheckCircle2, XCircle, Boxes } from 'lucide-react'
import KpiCard from '../components/dashboard/KpiCard'
import RecentActivityTable from '../components/dashboard/RecentActivityTable'
import ModuleCard from '../components/dashboard/ModuleCard'
import PageHeader from '../components/common/PageHeader'
import { useDashboardSummary } from '../components/dashboard/useDashboardSummary'
import { moduleRegistry, MODULE_STATUS } from '../config/moduleRegistry'

export default function OverviewPage() {
  const { status, data } = useDashboardSummary()
  const loading = status === 'loading'
  const activeModuleCount = moduleRegistry.filter((m) => m.status === MODULE_STATUS.ACTIVE).length

  // These first three KPIs are intentionally Parcel Image Intelligence
  // data specifically (not a cross-module total) — see
  // dashboard.service.js: the Node API only aggregates that module today,
  // so labeling these as platform-wide would misrepresent what's actually
  // counted. "Active Modules" is the one true platform-wide figure here,
  // computed straight from the module registry with no backend involved.
  const kpis = [
    { label: 'Total Images Processed', value: data.totalImagesProcessed, icon: ImageIcon, accent: 'indigo' },
    { label: 'Successful Extractions', value: data.successfulExtractions, icon: CheckCircle2, accent: 'green' },
    { label: 'Failed Extractions', value: data.failedExtractions, icon: XCircle, accent: 'red' },
    { label: 'Active Modules', value: activeModuleCount, icon: Boxes, accent: 'slate' },
  ]

  return (
    <div className="space-y-8">
      <PageHeader
        title="Welcome to NexusOps"
        subtitle="Your centralized intelligence platform for operational performance, compliance, and financial visibility."
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

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Recent Processing Activity</h2>
        <RecentActivityTable jobs={data.recentJobs} loading={loading} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">AI Modules Overview</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {moduleRegistry.map((mod) => (
            <ModuleCard key={mod.id} module={mod} />
          ))}
        </div>
      </section>
    </div>
  )
}
