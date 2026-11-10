import { humanizeStatus } from '../../utils/formatStatus'

const STATUS_STYLES = {
  PENDING: 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-white/5 dark:text-slate-400 dark:ring-white/10',
  QUEUED: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-cyan-500/10 dark:text-cyan-300 dark:ring-cyan-500/20',
  PROCESSING: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20',
  COMPLETED: 'bg-green-50 text-green-700 ring-green-200 dark:bg-green-500/10 dark:text-green-300 dark:ring-green-500/20',
  FAILED: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/20',
  PARTIALLY_COMPLETED: 'bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/20',
  DETECTED: 'bg-green-50 text-green-700 ring-green-200 dark:bg-green-500/10 dark:text-green-300 dark:ring-green-500/20',
  NEEDS_REVIEW: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20',
  MATCHED: 'bg-green-50 text-green-700 ring-green-200 dark:bg-green-500/10 dark:text-green-300 dark:ring-green-500/20',
  NAME_MISMATCH: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/20',
  AMOUNT_MISMATCH: 'bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/20',
  MISSING: 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-white/5 dark:text-slate-400 dark:ring-white/10',
  RED: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/20',
  YELLOW: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20',
  GREEN: 'bg-green-50 text-green-700 ring-green-200 dark:bg-green-500/10 dark:text-green-300 dark:ring-green-500/20',
  BLUE: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-cyan-500/10 dark:text-cyan-300 dark:ring-cyan-500/20',
  UNKNOWN: 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-white/5 dark:text-slate-400 dark:ring-white/10',
  CRITICAL: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/20',
  HIGH: 'bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/20',
  MEDIUM: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20',
  LOW: 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-white/5 dark:text-slate-400 dark:ring-white/10',
  INFO: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-cyan-500/10 dark:text-cyan-300 dark:ring-cyan-500/20',
  SUCCESS: 'bg-green-50 text-green-700 ring-green-200 dark:bg-green-500/10 dark:text-green-300 dark:ring-green-500/20',
  WARNING: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20',
  OPEN: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20',
  UNDER_REVIEW: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-cyan-500/10 dark:text-cyan-300 dark:ring-cyan-500/20',
  RESOLVED: 'bg-green-50 text-green-700 ring-green-200 dark:bg-green-500/10 dark:text-green-300 dark:ring-green-500/20',
  IGNORED: 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-white/5 dark:text-slate-400 dark:ring-white/10',
}

// Matches a status's text color so the leading dot reads as a tiny status
// light rather than a generic bullet.
const DOT_STYLES = {
  PENDING: 'bg-slate-400',
  QUEUED: 'bg-blue-500 dark:bg-cyan-400',
  PROCESSING: 'bg-amber-500',
  COMPLETED: 'bg-green-500',
  FAILED: 'bg-red-500',
  PARTIALLY_COMPLETED: 'bg-orange-500',
  DETECTED: 'bg-green-500',
  NEEDS_REVIEW: 'bg-amber-500',
  MATCHED: 'bg-green-500',
  NAME_MISMATCH: 'bg-red-500',
  AMOUNT_MISMATCH: 'bg-orange-500',
  MISSING: 'bg-slate-400',
  RED: 'bg-red-500',
  YELLOW: 'bg-amber-500',
  GREEN: 'bg-green-500',
  BLUE: 'bg-blue-500 dark:bg-cyan-400',
  UNKNOWN: 'bg-slate-400',
  CRITICAL: 'bg-red-500',
  HIGH: 'bg-orange-500',
  MEDIUM: 'bg-amber-500',
  LOW: 'bg-slate-400',
  INFO: 'bg-blue-500 dark:bg-cyan-400',
  SUCCESS: 'bg-green-500',
  WARNING: 'bg-amber-500',
  OPEN: 'bg-amber-500',
  UNDER_REVIEW: 'bg-blue-500 dark:bg-cyan-400',
  RESOLVED: 'bg-green-500',
  IGNORED: 'bg-slate-400',
}

export default function StatusBadge({ status }) {
  const className = STATUS_STYLES[status] || 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-white/5 dark:text-slate-400 dark:ring-white/10'
  const dotClassName = DOT_STYLES[status] || 'bg-slate-400'
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${className}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotClassName}`} />
      {humanizeStatus(status)}
    </span>
  )
}
