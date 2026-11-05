import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Inbox } from 'lucide-react'
import PageHeader from '../../../components/common/PageHeader'
import Button from '../../../components/common/Button'
import Card from '../../../components/common/Card'
import Spinner from '../../../components/common/Spinner'
import EmptyState from '../../../components/common/EmptyState'
import SearchInput from '../../../components/common/SearchInput'
import FilterSelect from '../../../components/common/FilterSelect'
import DigestCard from '../components/DigestCard'
import { useDigests } from '../hooks/useDigests'
import { listDigestDates } from '../services/fcFinancialApi'

export default function DailyDigestPage() {
  const [dates, setDates] = useState([])
  const [filters, setFilters] = useState({})
  const { status, date, digests } = useDigests(filters)

  useEffect(() => {
    listDigestDates()
      .then(setDates)
      .catch(() => setDates([]))
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daily Digest"
        subtitle="One colour-coded financial digest per fulfilment centre, for a specific date."
        actions={
          <Button as={Link} to="/modules/fc-financial" variant="ghost" size="sm">
            <ArrowLeft size={14} />
            Back to Dashboard
          </Button>
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <FilterSelect
          value={filters.date || date || ''}
          onChange={(event) => setFilters({ ...filters, date: event.target.value || undefined })}
          options={dates}
          placeholder={dates.length === 0 ? 'No dates available' : undefined}
        />

        <SearchInput
          value={filters.fc || ''}
          onChange={(event) => setFilters({ ...filters, fc: event.target.value || undefined })}
          placeholder="Search FC name..."
          className="w-full sm:max-w-xs"
        />
      </div>

      {status === 'loading' ? (
        <Card padding="lg" className="flex items-center justify-center">
          <Spinner label="Loading digests…" />
        </Card>
      ) : digests.length === 0 ? (
        <EmptyState icon={Inbox} title="No digest available for this date." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {digests.map((digest) => (
            <DigestCard key={digest.fcName} digest={digest} />
          ))}
        </div>
      )}
    </div>
  )
}
