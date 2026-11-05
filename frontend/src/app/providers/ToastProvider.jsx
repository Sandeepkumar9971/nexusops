import { createContext, useCallback, useContext, useState } from 'react'
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)
let nextId = 0

const VARIANT_STYLES = {
  success: {
    icon: CheckCircle2,
    iconClass: 'text-green-500 dark:text-green-400',
    ring: 'ring-green-200 dark:ring-green-500/20',
  },
  error: {
    icon: XCircle,
    iconClass: 'text-red-500 dark:text-red-400',
    ring: 'ring-red-200 dark:ring-red-500/20',
  },
  warning: {
    icon: AlertTriangle,
    iconClass: 'text-amber-500 dark:text-amber-400',
    ring: 'ring-amber-200 dark:ring-amber-500/20',
  },
  info: {
    icon: Info,
    iconClass: 'text-blue-500 dark:text-cyan-400',
    ring: 'ring-blue-200 dark:ring-cyan-500/20',
  },
}

const AUTO_DISMISS_MS = 5000

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const notify = useCallback(
    (message, { variant = 'info', title } = {}) => {
      const id = nextId++
      setToasts((prev) => [...prev, { id, message, variant, title }])
      setTimeout(() => dismiss(id), AUTO_DISMISS_MS)
      return id
    },
    [dismiss],
  )

  return (
    <ToastContext.Provider value={{ notify, dismiss }}>
      {children}

      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((toast) => {
          const { icon: Icon, iconClass, ring } = VARIANT_STYLES[toast.variant] || VARIANT_STYLES.info
          return (
            <div
              key={toast.id}
              role="status"
              className={`pointer-events-auto flex items-start gap-3 rounded-xl border border-slate-200/80 bg-white/95 p-3.5 shadow-soft-lg ring-1 backdrop-blur-sm animate-[toast-in_0.2s_ease-out] dark:border-white/10 dark:bg-[rgba(22,34,53,0.92)] dark:backdrop-blur-xl ${ring}`}
            >
              <Icon size={18} className={`mt-0.5 shrink-0 ${iconClass}`} />
              <div className="min-w-0 flex-1">
                {toast.title && <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{toast.title}</p>}
                <p className="text-sm text-slate-600 dark:text-slate-300">{toast.message}</p>
              </div>
              <button
                onClick={() => dismiss(toast.id)}
                className="shrink-0 rounded-md p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-slate-300"
                aria-label="Dismiss notification"
              >
                <X size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within ToastProvider')
  return context
}
