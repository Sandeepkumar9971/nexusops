import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-50">404</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400">This page doesn't exist.</p>
      <Link to="/" className="text-sm font-medium text-indigo-600 hover:underline dark:text-blue-400">
        Back to Overview
      </Link>
    </div>
  )
}
