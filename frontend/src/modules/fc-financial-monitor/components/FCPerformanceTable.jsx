import { Link } from 'react-router-dom'
import DataTable from '../../../components/data-table/DataTable'
import StatusBadge from '../../../components/common/StatusBadge'

export default function FCPerformanceTable({ fcs }) {
  const columns = [
    {
      key: 'fcName',
      label: 'FC Name',
      sortable: true,
      render: (row) => (
        <Link to={`/modules/fc-financial/fcs/${encodeURIComponent(row.fcName)}`} className="font-medium text-indigo-600 hover:underline dark:text-blue-400">
          {row.fcName}
        </Link>
      ),
    },
    { key: 'latestDate', label: 'Latest Date', sortable: true },
    { key: 'revenue', label: 'Revenue', sortable: true, render: (row) => `₹${row.revenue.toLocaleString()}` },
    { key: 'cm1Percentage', label: 'CM1 %', sortable: true, render: (row) => (row.cm1Percentage != null ? `${row.cm1Percentage}%` : '—') },
    { key: 'cm2Percentage', label: 'CM2 %', sortable: true, render: (row) => (row.cm2Percentage != null ? `${row.cm2Percentage}%` : '—') },
    { key: 'overallStatus', label: 'Status', sortable: true, render: (row) => <StatusBadge status={row.overallStatus} /> },
    { key: 'anomalyCount', label: 'Anomalies', sortable: true },
    { key: 'mainIssue', label: 'Main Issue', render: (row) => row.mainIssue || '—' },
  ]

  const rows = fcs.map((fc) => ({ ...fc, id: fc.fcName }))

  return <DataTable columns={columns} rows={rows} pageSize={10} />
}
