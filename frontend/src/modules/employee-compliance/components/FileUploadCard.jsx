import { useRef, useState } from 'react'
import { FileSpreadsheet, FileText, X, AlertTriangle, CheckCircle2 } from 'lucide-react'
import Card from '../../../components/common/Card'

const ICONS = { wagesheet: FileSpreadsheet, pfEcr: FileText, esicEcr: FileText }

export default function FileUploadCard({ field, file, error, onSelect, onClear }) {
  const inputRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const Icon = ICONS[field.key] ?? FileText

  const handleDrop = (event) => {
    event.preventDefault()
    setIsDragging(false)
    const dropped = event.dataTransfer.files?.[0]
    if (dropped) onSelect(dropped)
  }

  return (
    <Card padding="sm" className={error ? 'border-red-200 dark:border-red-500/20' : file ? 'border-green-200 dark:border-green-500/20' : ''}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{field.label}</h3>
        {file && !error && <CheckCircle2 size={16} className="text-green-500 dark:text-green-400" />}
      </div>
      <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{field.hint}</p>

      <div
        onDragOver={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !file && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        className={`mt-3 flex min-h-[7rem] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 text-center transition-colors ${
          isDragging
            ? 'border-indigo-400 bg-indigo-50 dark:border-blue-400/50 dark:bg-blue-500/10'
            : error
              ? 'border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-500/[0.07]'
              : file
                ? 'border-green-200 bg-green-50 cursor-default dark:border-green-500/20 dark:bg-green-500/[0.07]'
                : 'border-slate-300 bg-white hover:border-indigo-300 hover:bg-slate-50 dark:border-navy-border dark:bg-navy-surface dark:hover:border-blue-400/40 dark:hover:bg-white/[0.03]'
        }`}
      >
        {file ? (
          <>
            <Icon size={22} className="text-slate-500 dark:text-slate-400" />
            <p className="max-w-full truncate px-2 text-xs font-medium text-slate-700 dark:text-slate-200" title={file.name}>
              {file.name}
            </p>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onClear()
              }}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400"
            >
              <X size={12} /> Remove
            </button>
          </>
        ) : (
          <>
            <Icon size={22} className="text-slate-300 dark:text-slate-600" />
            <p className="text-xs text-slate-500 dark:text-slate-400">Drag and drop, or click to browse</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={field.accept}
          className="hidden"
          onChange={(event) => {
            const selected = event.target.files?.[0]
            if (selected) onSelect(selected)
            event.target.value = ''
          }}
        />
      </div>

      {error && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
          <AlertTriangle size={12} className="shrink-0" />
          {error}
        </p>
      )}
    </Card>
  )
}
