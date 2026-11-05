export default function EmptyState({ icon: Icon, title, description, action, dashed = true }) {
  return (
    <div
      className={`rounded-2xl border bg-white p-12 text-center dark:bg-navy-surface ${
        dashed ? 'border-dashed border-slate-300 dark:border-navy-border' : 'border-slate-200/80 shadow-soft dark:border-navy-border/60'
      }`}
    >
      {Icon && (
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-white/5">
          <Icon size={22} className="text-slate-400 dark:text-slate-500" />
        </span>
      )}
      {title && <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{title}</p>}
      {description && <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
