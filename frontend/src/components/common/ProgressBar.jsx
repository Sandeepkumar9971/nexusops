export default function ProgressBar({ value = 0, label, className = '' }) {
  const clamped = Math.min(100, Math.max(0, value))
  return (
    <div className={className}>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-300 dark:from-blue-500 dark:to-cyan-400"
          style={{ width: `${clamped}%` }}
        />
      </div>
      {label !== false && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{label ?? `${clamped}% complete`}</p>}
    </div>
  )
}
