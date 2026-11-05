import { useState } from 'react'
import DataTable from '../../../components/data-table/DataTable'
import StatusBadge from '../../../components/common/StatusBadge'
import Button from '../../../components/common/Button'
import ImageDetailsDrawer from './ImageDetailsDrawer'

const STATUS_OPTIONS = ['DETECTED', 'NEEDS_REVIEW', 'FAILED']

export default function ResultsTable({ jobId, results }) {
  const [selected, setSelected] = useState(null)

  const columns = [
    {
      key: 'filename',
      label: 'Filename',
      sortable: true,
      render: (row) => (
        <span className="block max-w-[14rem] truncate" title={row.filename}>
          {row.filename}
        </span>
      ),
    },
    { key: 'awb', label: 'AWB', render: (row) => row.fields?.awb ?? '—' },
    {
      key: 'weight',
      label: 'Weight',
      render: (row) => (row.fields?.weight != null ? `${row.fields.weight} kg` : '—'),
    },
    {
      key: 'dimensions',
      label: 'Dimensions',
      render: (row) =>
        row.fields?.length != null
          ? `${row.fields.length}×${row.fields.width}×${row.fields.height} cm`
          : '—',
    },
    { key: 'status', label: 'Status', sortable: true, render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'ocrConfidence',
      label: 'Confidence',
      sortable: true,
      render: (row) => {
        // OCR confidence only means something when Tesseract actually ran —
        // Gemini doesn't report a comparable score (showing "0%" next to a
        // successful Gemini extraction would read as a contradiction), and
        // "ocr_unavailable" means Tesseract never ran at all (not that it
        // ran and scored 0%, which would wrongly blame the photo).
        if (row.extractionMethod === 'gemini') return 'Gemini'
        if (row.extractionMethod === 'ocr_unavailable') return 'OCR Unavailable'
        return row.ocrConfidence != null ? `${row.ocrConfidence}%` : '—'
      },
    },
    {
      key: 'errorReason',
      label: 'Error Reason',
      render: (row) =>
        row.errorReason ? (
          <span className="block max-w-[16rem] truncate text-amber-700 dark:text-amber-400" title={row.errorReason}>
            {row.errorReason}
          </span>
        ) : (
          '—'
        ),
    },
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

  const rows = results.map((result) => ({ ...result, id: result._id }))

  return (
    <>
      <DataTable
        columns={columns}
        rows={rows}
        searchKeys={['filename']}
        statusKey="status"
        statusOptions={STATUS_OPTIONS}
        pageSize={10}
      />
      {selected && <ImageDetailsDrawer result={selected} jobId={jobId} onClose={() => setSelected(null)} />}
    </>
  )
}
