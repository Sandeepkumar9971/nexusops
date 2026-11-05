import Card from '../common/Card'

const ACCENT_CLASSES = {
  indigo: 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-md shadow-indigo-500/25 dark:from-blue-500 dark:to-blue-600 dark:shadow-blue-500/25',
  green: 'bg-gradient-to-br from-green-500 to-green-600 text-white shadow-md shadow-green-500/25',
  red: 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-md shadow-red-500/25',
  slate: 'bg-gradient-to-br from-slate-500 to-slate-600 text-white shadow-md shadow-slate-500/20 dark:from-navy-surface2 dark:to-navy-surface2 dark:shadow-none dark:ring-1 dark:ring-white/10',
}

export default function KpiCard({ label, value, icon: Icon, accent = 'indigo', loading }) {
  return (
    <Card padding="sm" interactive variant="glass">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</span>
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${ACCENT_CLASSES[accent]}`}>
          <Icon size={18} />
        </span>
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 tabular-nums dark:text-slate-50">
        {loading ? (
          <span className="inline-block h-8 w-16 animate-pulse rounded-md bg-slate-200 dark:bg-white/10" />
        ) : (
          value
        )}
      </div>
    </Card>
  )
}
