import { Loader2 } from 'lucide-react'

const VARIANT_CLASSES = {
  primary:
    'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-700 hover:shadow-md hover:shadow-indigo-600/25 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none dark:bg-blue-500 dark:shadow-blue-500/25 dark:hover:bg-blue-400 dark:hover:shadow-blue-500/30 dark:disabled:bg-navy-surface2 dark:disabled:text-slate-500',
  secondary:
    'border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 disabled:border-slate-100 disabled:text-slate-300 disabled:shadow-none dark:border-navy-border dark:bg-navy-surface2 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-navy-surface2/70 dark:disabled:border-navy-border dark:disabled:text-slate-600',
  ghost:
    'text-indigo-600 hover:bg-indigo-50 disabled:text-slate-300 dark:text-blue-400 dark:hover:bg-blue-500/10 dark:disabled:text-slate-600',
  danger:
    'bg-red-600 text-white shadow-sm shadow-red-600/20 hover:bg-red-700 hover:shadow-md hover:shadow-red-600/25 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none dark:bg-red-500 dark:shadow-red-500/25 dark:hover:bg-red-400',
}

const SIZE_CLASSES = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  as: Component = 'button',
  ...rest
}) {
  return (
    <Component
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:active:scale-100 dark:focus-visible:ring-blue-500 dark:focus-visible:ring-offset-navy-bg ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...rest}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </Component>
  )
}
