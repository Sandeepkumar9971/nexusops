import { Link, useLocation } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { moduleRegistry } from '../../config/moduleRegistry'

const STATIC_LABELS = {
  history: 'Processing History',
  reports: 'Reports',
  settings: 'Settings',
  modules: 'Modules',
  upload: 'Upload',
  new: 'New',
  anomalies: 'Anomalies',
  digests: 'Daily Digest',
  targets: 'Target Configuration',
  batches: 'Batches',
  fcs: 'Fulfilment Centres',
}

// A Mongo ObjectId (or any long hex-looking id) in the URL reads as noise
// in a breadcrumb — shown as a generic "Details" crumb instead of the raw
// 24-character hex string.
function isOpaqueId(segment) {
  return /^[0-9a-f]{12,}$/i.test(segment)
}

function labelFor(segment, fullPathSoFar) {
  const moduleMatch = moduleRegistry.find((m) => m.route === fullPathSoFar)
  if (moduleMatch) return moduleMatch.name
  if (STATIC_LABELS[segment]) return STATIC_LABELS[segment]
  if (isOpaqueId(segment)) return 'Details'
  return segment
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export default function Breadcrumb() {
  const location = useLocation()
  const segments = location.pathname.split('/').filter(Boolean)

  if (segments.length === 0) {
    return <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Overview</span>
  }

  let pathSoFar = ''
  const crumbs = segments.map((segment, idx) => {
    pathSoFar += `/${segment}`
    return { label: labelFor(segment, pathSoFar), to: pathSoFar, isLast: idx === segments.length - 1 }
  })

  return (
    <nav className="flex items-center gap-1.5 overflow-hidden whitespace-nowrap text-sm" aria-label="Breadcrumb">
      <Link to="/" className="font-medium text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300">
        Home
      </Link>
      {crumbs.map((crumb) => (
        <span key={crumb.to} className="flex items-center gap-1.5">
          <ChevronRight size={13} className="text-slate-300 dark:text-slate-600" />
          {crumb.isLast ? (
            <span className="font-semibold text-slate-800 dark:text-slate-100">{crumb.label}</span>
          ) : (
            <Link to={crumb.to} className="font-medium text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  )
}
