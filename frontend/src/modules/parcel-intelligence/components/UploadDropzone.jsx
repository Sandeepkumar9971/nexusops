import { useRef, useState } from 'react'
import { UploadCloud } from 'lucide-react'
import { ACCEPTED_INPUT_ACCEPT, MAX_FILE_SIZE_MB } from '../constants'

export default function UploadDropzone({ onFilesSelected }) {
  const inputRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleDrop = (event) => {
    event.preventDefault()
    setIsDragging(false)
    if (event.dataTransfer.files?.length) {
      onFilesSelected(event.dataTransfer.files)
    }
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
      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Drag and drop parcel images here</p>
      <p className="text-xs text-slate-400 dark:text-slate-500">or click to browse — JPG/PNG, up to {MAX_FILE_SIZE_MB}MB each</p>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_INPUT_ACCEPT}
        multiple
        className="hidden"
        onChange={(event) => {
          if (event.target.files?.length) onFilesSelected(event.target.files)
          event.target.value = ''
        }}
      />
    </div>
  )
}
