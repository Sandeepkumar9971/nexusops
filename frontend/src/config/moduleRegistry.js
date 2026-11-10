import { Package, ShieldCheck, TrendingUp } from 'lucide-react'

export const MODULE_STATUS = {
  ACTIVE: 'active',
  COMING_SOON: 'coming-soon',
}

/**
 * Single source of truth for every AI module on the platform.
 * Sidebar nav, the Overview module cards, and the router all read
 * from this list — adding a module means adding an entry here plus
 * its own module folder, never editing shared shell components.
 */
export const moduleRegistry = [
  {
    id: 'parcel-intelligence',
    name: 'Parcel Image Intelligence',
    description: 'Extract shipment information automatically from parcel photographs.',
    icon: Package,
    route: '/modules/parcel-intelligence',
    status: MODULE_STATUS.ACTIVE,
    backendService: 'node-api:parcel-intelligence',
    requiredPermissions: [],
  },
  {
    id: 'compliance-verification',
    name: 'Employee Compliance Verification',
    description: 'Verify wagesheets against PF and ESIC ECR filings.',
    icon: ShieldCheck,
    route: '/modules/compliance',
    status: MODULE_STATUS.ACTIVE,
    backendService: 'node-api:employee-compliance',
    requiredPermissions: [],
  },
  {
    id: 'fc-financial-monitor',
    name: 'FC Financial Monitor',
    description: 'Track CM1/CM2, detect cost anomalies, and surface financial insights.',
    icon: TrendingUp,
    route: '/modules/fc-financial',
    status: MODULE_STATUS.ACTIVE,
    backendService: 'node-api:fc-financial-monitor',
    requiredPermissions: [],
  },
]

export const getModuleById = (id) => moduleRegistry.find((mod) => mod.id === id)

const STATIC_PAGE_TITLES = {
  '/': 'Overview',
  '/history': 'Processing History',
  '/notifications': 'Notification Centre',
  '/reports': 'Reports',
  '/settings': 'Settings',
}

// Drives the Navbar's current-page label — single source of truth so every
// route (including future modules) is automatically covered.
export const getPageTitle = (pathname) => {
  if (STATIC_PAGE_TITLES[pathname]) return STATIC_PAGE_TITLES[pathname]
  const mod = moduleRegistry.find((m) => m.route === pathname)
  return mod ? mod.name : 'NexusOps'
}
