import { useState } from 'react'
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import FinancialUploadDropzone from './FinancialUploadDropzone'
import ColumnMappingPanel from './ColumnMappingPanel'
import Card from '../../../components/common/Card'
import Button from '../../../components/common/Button'
import Spinner from '../../../components/common/Spinner'
import { useFinancialUpload } from '../hooks/useFinancialUpload'

function Stat({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-400 dark:text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-900 tabular-nums dark:text-slate-50">{value}</p>
    </div>
  )
}

export default function FinancialUploadWorkspace({ onBatchCreated }) {
  const {
    file,
    preview,
    previewing,
    previewError,
    defaultFcName,
    setFcNameOverride,
    selectFile,
    remapColumn,
    reset,
    submitBatch,
    submitting,
    submitError,
  } = useFinancialUpload()
  const [fcNameInput, setFcNameInput] = useState('')

  const handleProcess = async () => {
    const job = await submitBatch()
    if (job) onBatchCreated(job)
  }

  const needsFcName = preview && preview.fcIdentifierPresent === false

  return (
    <div className="space-y-4">
      <FinancialUploadDropzone file={file} onFileSelected={selectFile} onClear={reset} />

      {previewing && <Spinner label="Analyzing file…" />}

      {previewError && (
        <p className="flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400">
          <AlertTriangle size={14} className="shrink-0" />
          {previewError}
        </p>
      )}

      {preview && (
        <>
          <Card padding="sm" className={preview.valid ? 'border-green-200 dark:border-green-500/20' : 'border-red-200 dark:border-red-500/20'}>
            <div className="flex items-center gap-2">
              {preview.valid ? (
                <CheckCircle2 size={16} className="text-green-600 dark:text-green-400" />
              ) : (
                <AlertTriangle size={16} className="text-red-600 dark:text-red-400" />
              )}
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {preview.valid ? 'File is ready to process' : 'File cannot be processed yet'}
              </h3>
            </div>

            {preview.errors?.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-red-600 dark:text-red-400">
                {preview.errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            )}

            {preview.valid && (
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Records" value={preview.recordCount} />
                <Stat label="FCs Detected" value={preview.fcCount} />
                <Stat
                  label="Date Range"
                  value={preview.dateRange ? `${preview.dateRange.start} → ${preview.dateRange.end}` : '—'}
                />
                <Stat label="Row Issues" value={preview.rowIssueCount} />
              </div>
            )}
          </Card>

          {preview.notes?.length > 0 && (
            <div className="space-y-1 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700 dark:border-cyan-500/20 dark:bg-cyan-500/10 dark:text-cyan-300">
              {preview.notes.map((note, idx) => (
                <p key={idx} className="flex items-start gap-1.5">
                  <Info size={12} className="mt-0.5 shrink-0" />
                  {note}
                </p>
              ))}
            </div>
          )}

          {needsFcName && (
            <Card padding="sm">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">FC Name for This File</h3>
              <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                This file has no FC Name/ID column — every row in it belongs to one facility. Enter that facility's
                name to apply it to every record.
              </p>
              <div className="mt-3 flex gap-2">
                <input
                  value={fcNameInput}
                  onChange={(event) => setFcNameInput(event.target.value)}
                  placeholder="e.g. Mumbai FC"
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm transition-colors focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 dark:border-navy-border dark:bg-navy-surface2 dark:text-slate-100 dark:focus:border-blue-400/50 dark:focus:ring-blue-500/15"
                />
                <Button size="sm" onClick={() => setFcNameOverride(fcNameInput)} disabled={!fcNameInput.trim()}>
                  Apply
                </Button>
              </div>
              {defaultFcName && <p className="mt-2 text-xs text-green-600 dark:text-green-400">Applying "{defaultFcName}" to every row.</p>}
            </Card>
          )}

          <ColumnMappingPanel detectedColumns={preview.detectedColumns} detectedMapping={preview.detectedMapping} onRemap={remapColumn} />

          {submitError && (
            <p className="flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400">
              <AlertTriangle size={14} className="shrink-0" />
              {submitError}
            </p>
          )}

          <Button onClick={handleProcess} disabled={!preview.valid} loading={submitting}>
            {submitting ? 'Starting…' : 'Process Financial Data'}
          </Button>
        </>
      )}
    </div>
  )
}
