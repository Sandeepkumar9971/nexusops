import { useState } from 'react'
import DataTable from '../../../components/data-table/DataTable'
import StatusBadge from '../../../components/common/StatusBadge'
import Button from '../../../components/common/Button'
import EmployeeDetailDrawer from './EmployeeDetailDrawer'
import { VERIFICATION_STATUS, VERIFICATION_STATUS_OPTIONS } from '../constants'

// Most-severe-first — a row's single filterable status is whichever side
// (PF or ESIC) is in the worse state, so "Name Mismatch" surfaces the row
// even if only one of the two sides actually has that problem.
const STATUS_SEVERITY = [
  VERIFICATION_STATUS.NAME_MISMATCH,
  VERIFICATION_STATUS.AMOUNT_MISMATCH,
  VERIFICATION_STATUS.MISSING,
  VERIFICATION_STATUS.NEEDS_REVIEW,
  VERIFICATION_STATUS.MATCHED,
]

function overallStatus(row) {
  const statuses = [row.pf?.status, row.esic?.status].filter(Boolean)
  return STATUS_SEVERITY.find((s) => statuses.includes(s)) ?? VERIFICATION_STATUS.MATCHED
}

export default function EmployeeResultsTable({ results }) {
  const [selected, setSelected] = useState(null)

  const columns = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (row) => (
        <span className="block max-w-[12rem] truncate" title={row.employee.name}>
          {row.employee.name}
        </span>
      ),
    },
    { key: 'uan', label: 'UAN', render: (row) => row.employee.uan || '—' },
    { key: 'ipNumber', label: 'IP Number', render: (row) => row.employee.ipNumber || '—' },
    { key: 'agency', label: 'Agency', render: (row) => row.employee.agency || '—' },
    { key: 'pfStatus', label: 'PF Status', render: (row) => <StatusBadge status={row.pf?.status} /> },
    { key: 'esicStatus', label: 'ESIC Status', render: (row) => <StatusBadge status={row.esic?.status} /> },
    {
      key: 'actions',
      label: '',
      render: (row) => (
        <Button variant="ghost" size="sm" onClick={() => setSelected(row)} className="px-0 hover:bg-transparent hover:underline">
          View Details
        </Button>
      ),
    },
  ]

  const rows = results.map((result) => ({
    ...result,
    id: result._id,
    name: result.employee.name,
    uan: result.employee.uan,
    ipNumber: result.employee.ipNumber,
    overallStatus: overallStatus(result),
  }))

  return (
    <>
      <DataTable
        columns={columns}
        rows={rows}
        searchKeys={['name', 'uan', 'ipNumber']}
        statusKey="overallStatus"
        statusOptions={VERIFICATION_STATUS_OPTIONS}
        pageSize={10}
      />
      {selected && <EmployeeDetailDrawer result={selected} onClose={() => setSelected(null)} />}
    </>
  )
}
