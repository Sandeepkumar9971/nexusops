import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import PageHeader from '../../../components/common/PageHeader'
import Button from '../../../components/common/Button'
import Card from '../../../components/common/Card'
import Spinner from '../../../components/common/Spinner'
import StatusBadge from '../../../components/common/StatusBadge'
import ErrorState from '../../../components/common/ErrorState'
import CostBreakdownTable from '../components/CostBreakdownTable'
import FCDetailCharts from '../components/FCDetailCharts'
import { useFCDetail } from '../hooks/useFCDetail'

function Stat({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-400 dark:text-slate-500">{label}</p>
      <p className="text-lg font-semibold text-slate-900 tabular-nums dark:text-slate-50">{value}</p>
    </div>
  )
}

export default function FCDetailPage() {
  const { fcName } = useParams()
  const { status, data, error } = useFCDetail(fcName)

  return (
    <div className="space-y-6">
      <PageHeader
        title={decodeURIComponent(fcName)}
        subtitle="Financial summary, cost breakdown, and historical trends."
        actions={
          <Button as={Link} to="/modules/fc-financial" variant="ghost" size="sm">
            <ArrowLeft size={14} />
            Back to Dashboard
          </Button>
        }
      />

      {status === 'loading' && (
        <Card className="flex items-center justify-center">
          <Spinner label="Loading FC details…" />
        </Card>
      )}

      {status === 'error' && (
        <ErrorState title={error?.response?.status === 404 ? 'No financial records found for this FC.' : 'Could not load FC details.'} />
      )}

      {status === 'success' && data && (
        <>
          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">Latest: {data.summary.latestDate}</p>
              <StatusBadge status={data.summary.overallStatus} />
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-6">
              <Stat label="Revenue" value={`₹${data.summary.revenue.toLocaleString()}`} />
              <Stat label="Total Costs" value={`₹${data.summary.totalCosts.toLocaleString()}`} />
              <Stat label="CM1" value={`₹${data.summary.cm1.toLocaleString()}`} />
              <Stat label="CM1 %" value={data.summary.cm1Percentage != null ? `${data.summary.cm1Percentage}%` : '—'} />
              <Stat label="CM2" value={`₹${data.summary.cm2.toLocaleString()}`} />
              <Stat label="CM2 %" value={data.summary.cm2Percentage != null ? `${data.summary.cm2Percentage}%` : '—'} />
            </div>
          </Card>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Cost Breakdown</h2>
            <CostBreakdownTable costBreakdown={data.costBreakdown} />
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Historical Trends</h2>
            <FCDetailCharts trends={data.trends} anomalyCounts={data.anomalyCounts} />
          </section>
        </>
      )}
    </div>
  )
}
