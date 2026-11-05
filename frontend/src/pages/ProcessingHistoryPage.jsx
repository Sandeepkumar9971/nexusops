import { History } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import EmptyState from '../components/common/EmptyState'

export default function ProcessingHistoryPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Processing History" subtitle="Jobs across all AI modules, in one place." />
      <EmptyState
        icon={History}
        title="Coming soon"
        description="The shared jobs table arrives in Phase 12, reading from the generic Job collection."
      />
    </div>
  )
}
