import { useRef, useState } from 'react'
import { UploadCloud, FileSpreadsheet, X } from 'lucide-react'
import { FINANCIAL_FILE_ACCEPT, MAX_FILE_SIZE_MB } from '../constants'

export default function FinancialUploadDropzone({ file, onFileSelected, onClear }) {
  const inputRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleDrop = (event) => {
    event.preventDefault()
    setIsDragging(false)
    const dropped = event.dataTransfer.files?.[0]
    if (dropped) onFileSelected(dropped)
  }

  if (file) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-500/20 dark:bg-green-500/[0.07]">
        <div className="flex items-center gap-3">
          <FileSpreadsheet size={20} className="text-green-600 dark:text-green-400" />
          <div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{file.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
        </div>
        <button onClick={onClear} className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400">
          <X size={14} /> Remove
        </button>
      </div>
    )
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
        isDragging
          ? 'border-indigo-400 bg-indigo-50 dark:border-blue-400/50 dark:bg-blue-500/10'
          : 'border-slate-300 bg-white hover:border-indigo-300 hover:bg-slate-50 dark:border-navy-border dark:bg-navy-surface dark:hover:border-blue-400/40 dark:hover:bg-white/[0.03]'
      }`}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-500 dark:bg-blue-500/10 dark:text-blue-400">
        <UploadCloud size={22} />
      </span>
      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Drag and drop your daily financial data here</p>
      <p className="text-xs text-slate-400 dark:text-slate-500">or click to browse — Excel (.xlsx/.xls) or CSV, up to {MAX_FILE_SIZE_MB}MB</p>
      <input
        ref={inputRef}
        type="file"
        accept={FINANCIAL_FILE_ACCEPT}
        className="hidden"
        onChange={(event) => {
          const selected = event.target.files?.[0]
          if (selected) onFileSelected(selected)
          event.target.value = ''
        }}
      />
    </div>
  )
}
