import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Inbox } from 'lucide-react'
import PageHeader from '../../../components/common/PageHeader'
import Button from '../../../components/common/Button'
import EmptyState from '../../../components/common/EmptyState'
import Spinner from '../../../components/common/Spinner'
import Card from '../../../components/common/Card'
import FinancialSummaryCards from '../components/FinancialSummaryCards'
import FCFilterBar from '../components/FCFilterBar'
import FCPerformanceTable from '../components/FCPerformanceTable'
import { useFinancialDashboard } from '../hooks/useFinancialDashboard'
import { useFCList } from '../hooks/useFCList'

export default function FinancialDashboardPage() {
  const { status, data } = useFinancialDashboard()
  const loading = status === 'loading'
  const [filters, setFilters] = useState({})
  const { status: fcStatus, fcs } = useFCList(filters)

  return (
    <div className="space-y-8">
      <PageHeader
        title="FC Financial Monitor"
        subtitle="Monitor fulfilment centre financial performance, contribution margins, cost anomalies, and daily alerts."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button as={Link} to="/modules/fc-financial/anomalies" variant="secondary">
              Anomalies
            </Button>
            <Button as={Link} to="/modules/fc-financial/digests" variant="secondary">
              Daily Digest
            </Button>
            <Button as={Link} to="/modules/fc-financial/targets" variant="secondary">
              Target Configuration
            </Button>
            <Button as={Link} to="/modules/fc-financial/upload">
              Upload Financial Data
            </Button>
          </div>
        }
      />

      {status === 'error' && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>Couldn't reach the backend API. Showing zero values until the connection is restored.</span>
        </div>
      )}

      <FinancialSummaryCards data={data} loading={loading} />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">FC Performance</h2>
        <FCFilterBar filters={filters} onChange={setFilters} />

        {fcStatus === 'loading' ? (
          <Card padding="lg" className="flex items-center justify-center">
            <Spinner label="Loading FC performance…" />
          </Card>
        ) : fcs.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No financial data yet."
            description="Upload a daily financial data file to see FC performance here."
            action={
              <Button as={Link} to="/modules/fc-financial/upload" variant="ghost" size="sm">
                Upload Financial Data →
              </Button>
            }
          />
        ) : (
          <FCPerformanceTable fcs={fcs} />
        )}
      </section>
    </div>
  )
}
