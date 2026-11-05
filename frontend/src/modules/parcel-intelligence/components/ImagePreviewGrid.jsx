import { X, AlertTriangle } from 'lucide-react'

export default function ImagePreviewGrid({ files, onRemove }) {
  if (files.length === 0) return null

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {files.map(({ id, file, previewUrl, error }) => (
        <div
          key={id}
          className={`group relative overflow-hidden rounded-lg border bg-white dark:bg-navy-surface2 ${
            error ? 'border-red-300 dark:border-red-500/30' : 'border-slate-200 dark:border-navy-border'
          }`}
        >
          <img src={previewUrl} alt={file.name} className="h-24 w-full object-cover" />
          <button
            onClick={() => onRemove(id)}
            className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-slate-600 opacity-0 shadow transition-opacity group-hover:opacity-100 focus:opacity-100 dark:bg-navy-surface/90 dark:text-slate-300"
            aria-label={`Remove ${file.name}`}
          >
            <X size={14} />
          </button>
          {error && (
            <div className="flex items-center gap-1 bg-red-50 px-2 py-1 text-[10px] text-red-600 dark:bg-red-500/10 dark:text-red-400">
              <AlertTriangle size={12} className="shrink-0" />
              <span className="truncate" title={error}>
                {error}
              </span>
            </div>
          )}
          <p className="truncate px-2 py-1 text-[11px] text-slate-500 dark:text-slate-400" title={file.name}>
            {file.name}
          </p>
        </div>
      ))}
    </div>
  )
}
