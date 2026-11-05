import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { useAuth } from '../app/providers/AuthProvider'
import Button from '../components/common/Button'
import Logo from '../components/common/Logo'

export default function LoginPage() {
  const { login, status } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  if (status === 'authenticated') {
    const redirectTo = location.state?.from ?? '/'
    return <Navigate to={redirectTo} replace />
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(email, password)
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not sign in. Is the Node API running?')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 dark:bg-navy-bg">
      <div
        className="pointer-events-none absolute inset-0 opacity-60 dark:opacity-100"
        style={{
          backgroundImage:
            'radial-gradient(circle at 15% 20%, rgba(99,102,241,0.12), transparent 40%), radial-gradient(circle at 85% 80%, rgba(139,92,246,0.10), transparent 40%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 hidden opacity-100 dark:block"
        style={{
          backgroundImage:
            'radial-gradient(circle at 15% 20%, rgba(59,130,246,0.14), transparent 45%), radial-gradient(circle at 85% 75%, rgba(34,211,238,0.10), transparent 45%)',
        }}
      />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <Logo size="lg" />
          <div className="text-center">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">NexusOps</h1>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Operations Intelligence Platform</p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-7 shadow-soft-lg dark:border-white/10 dark:bg-[rgba(22,34,53,0.72)] dark:shadow-glass dark:backdrop-blur-xl"
        >
          {error && (
            <p className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 ring-1 ring-inset ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/20">
              <AlertTriangle size={14} className="shrink-0" />
              {error}
            </p>
          )}

          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm transition-colors focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 dark:border-navy-border dark:bg-navy-surface2 dark:text-slate-100 dark:focus:border-blue-400/50 dark:focus:ring-blue-500/15"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm transition-colors focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 dark:border-navy-border dark:bg-navy-surface2 dark:text-slate-100 dark:focus:border-blue-400/50 dark:focus:ring-blue-500/15"
            />
          </div>

          <Button type="submit" loading={submitting} className="w-full justify-center">
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  )
}
