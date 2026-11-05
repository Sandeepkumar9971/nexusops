import { AlertTriangle } from 'lucide-react'

// Distinct from EmptyState: this is for "something went wrong" (a failed
// request, a job that errored out), not "there's nothing here yet" — the
// red accent and icon make that distinction visible at a glance.
export default function ErrorState({ title = 'Something went wrong.', description, action }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-500/20 dark:bg-red-500/[0.07]">
      <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/15">
        <AlertTriangle size={20} className="text-red-600 dark:text-red-400" />
      </span>
      <p className="text-sm font-medium text-red-700 dark:text-red-300">{title}</p>
      {description && <p className="mt-1 text-sm text-red-500/80 dark:text-red-400/70">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
