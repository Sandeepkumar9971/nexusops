export default function ComingSoonPage({ module }) {
  const Icon = module?.icon

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-navy-border dark:bg-navy-surface">
      {Icon && (
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-500">
          <Icon size={28} />
        </span>
      )}
      <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-200">{module?.name}</h2>
      <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">{module?.description}</p>
      <span className="mt-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500 dark:bg-white/5 dark:text-slate-400">
        Coming Soon
      </span>
    </div>
  )
}
