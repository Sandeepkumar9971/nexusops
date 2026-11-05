export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex flex-col flex-wrap gap-4 border-b border-slate-200/80 pb-6 sm:flex-row sm:items-start sm:justify-between dark:border-white/10">
      <div className="min-w-[14rem] flex-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
