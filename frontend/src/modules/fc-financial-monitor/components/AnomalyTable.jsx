import { useState } from 'react'
import DataTable from '../../../components/data-table/DataTable'
import StatusBadge from '../../../components/common/StatusBadge'
import Button from '../../../components/common/Button'
import AnomalyDetailDrawer from './AnomalyDetailDrawer'

export default function AnomalyTable({ anomalies, onUpdated }) {
  const [selectedId, setSelectedId] = useState(null)

  const columns = [
    { key: 'date', label: 'Date', sortable: true },
    { key: 'fcName', label: 'FC', sortable: true },
    { key: 'metric', label: 'Line Item', sortable: true },
    { key: 'actualValue', label: '% of Revenue', render: (row) => (row.actualValue != null ? `${row.actualValue}%` : '—') },
    {
      key: 'targetRangeLabel',
      label: 'Target Range',
      render: (row) => (row.targetRange?.minimum != null ? `${row.targetRange.minimum}% – ${row.targetRange.maximum}%` : 'Not configured'),
    },
    { key: 'deviation', label: 'Deviation', render: (row) => (row.deviation != null ? `${row.deviation}pp` : '—') },
    {
      key: 'financialImpact',
      label: 'Financial Impact',
      render: (row) => (row.financialImpact != null ? `₹${row.financialImpact.toLocaleString()}` : '—'),
    },
    { key: 'severity', label: 'Severity', sortable: true, render: (row) => <StatusBadge status={row.severity} /> },
    { key: 'status', label: 'Status', sortable: true, render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'actions',
      label: '',
      render: (row) => (
        <Button variant="ghost" size="sm" onClick={() => setSelectedId(row._id)} className="px-0 hover:bg-transparent hover:underline">
          View / Update
        </Button>
      ),
    },
  ]

  const rows = anomalies.map((a) => ({ ...a, id: a._id }))

  return (
    <>
      <DataTable columns={columns} rows={rows} searchKeys={['fcName', 'metric']} pageSize={15} />
      {selectedId && (
        <AnomalyDetailDrawer
          anomalyId={selectedId}
          onClose={() => setSelectedId(null)}
          onUpdated={() => {
            onUpdated?.()
          }}
        />
      )}
    </>
  )
}
