import { Loader2 } from 'lucide-react'

export default function Spinner({ label, size = 16, className = '' }) {
  return (
    <div className={`flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500 ${className}`}>
      <Loader2 size={size} className="animate-spin" />
      {label && <span>{label}</span>}
    </div>
  )
}
