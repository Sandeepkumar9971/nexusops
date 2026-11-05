import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, LayoutDashboard, History, FileText, Settings } from 'lucide-react'
import { moduleRegistry, MODULE_STATUS } from '../../config/moduleRegistry'

// A real, working navigation search — not a decorative input. It searches
// the app's own destinations (modules + static pages) rather than
// pretending to search backend data it has no access to; this is honest
// about its scope while still being genuinely useful for quickly jumping
// to a module.
const STATIC_DESTINATIONS = [
  { label: 'Overview', to: '/', icon: LayoutDashboard },
  { label: 'Processing History', to: '/history', icon: History },
  { label: 'Reports', to: '/reports', icon: FileText },
  { label: 'Settings', to: '/settings', icon: Settings },
]

function buildDestinations() {
  const moduleDestinations = moduleRegistry
    .filter((m) => m.status === MODULE_STATUS.ACTIVE)
    .map((m) => ({ label: m.name, to: m.route, icon: m.icon, description: m.description }))
  return [...STATIC_DESTINATIONS, ...moduleDestinations]
}

const ALL_DESTINATIONS = buildDestinations()

export default function GlobalSearch() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const containerRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const matches = query.trim()
    ? ALL_DESTINATIONS.filter((d) => d.label.toLowerCase().includes(query.trim().toLowerCase()))
    : ALL_DESTINATIONS

  const goTo = (to) => {
    navigate(to)
    setQuery('')
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative hidden w-64 md:block">
      <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => setOpen(true)}
        placeholder="Jump to a module or page…"
        className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-sm text-slate-700 transition-colors placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/15 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-blue-400/50 dark:focus:bg-white/10 dark:focus:ring-blue-500/15"
      />

      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-slate-200/80 bg-white py-1 shadow-soft-lg dark:border-white/10 dark:bg-[rgba(22,34,53,0.97)] dark:backdrop-blur-xl">
          {matches.length === 0 ? (
            <p className="px-3 py-2.5 text-sm text-slate-400">No matches.</p>
          ) : (
            matches.map((dest) => (
              <button
                key={dest.to}
                onClick={() => goTo(dest.to)}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5"
              >
                <dest.icon size={15} className="shrink-0 text-slate-400 dark:text-slate-500" />
                {dest.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
