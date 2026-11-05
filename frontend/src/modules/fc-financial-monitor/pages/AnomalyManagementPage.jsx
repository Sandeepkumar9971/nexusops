import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Inbox } from 'lucide-react'
import PageHeader from '../../../components/common/PageHeader'
import Button from '../../../components/common/Button'
import Card from '../../../components/common/Card'
import Spinner from '../../../components/common/Spinner'
import EmptyState from '../../../components/common/EmptyState'
import AnomalyFilterBar from '../components/AnomalyFilterBar'
import AnomalyTable from '../components/AnomalyTable'
import { useAnomalyList } from '../hooks/useAnomalyList'

export default function AnomalyManagementPage() {
  const [filters, setFilters] = useState({})
  const { status, anomalies, refresh } = useAnomalyList(filters)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Anomaly Management"
        subtitle="Review flagged margin and cost anomalies across every fulfilment centre."
        actions={
          <Button as={Link} to="/modules/fc-financial" variant="ghost" size="sm">
            <ArrowLeft size={14} />
            Back to Dashboard
          </Button>
        }
      />

      <AnomalyFilterBar filters={filters} onChange={setFilters} />

      {status === 'loading' ? (
        <Card padding="lg" className="flex items-center justify-center">
          <Spinner label="Loading anomalies…" />
        </Card>
      ) : anomalies.length === 0 ? (
        <EmptyState icon={Inbox} title="No anomalies match these filters." />
      ) : (
        <AnomalyTable anomalies={anomalies} onUpdated={refresh} />
      )}
    </div>
  )
}
