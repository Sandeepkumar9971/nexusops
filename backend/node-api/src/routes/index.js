import { Router } from 'express'
import authRoutes from '../modules/auth/auth.routes.js'
import dashboardRoutes from '../modules/dashboard/dashboard.routes.js'
import jobsRoutes from '../modules/jobs/jobs.routes.js'
import reportsRoutes from '../modules/reports/reports.routes.js'
import systemRoutes from '../modules/system/system.routes.js'
import notificationsRoutes from '../modules/notifications/notifications.routes.js'
import internalRoutes from '../modules/internal/internal.routes.js'
import parcelIntelligenceRoutes from '../modules/parcel-intelligence/parcelIntelligence.routes.js'
import employeeComplianceRoutes from '../modules/employee-compliance/employeeCompliance.routes.js'
import fcFinancialMonitorRoutes from '../modules/fc-financial-monitor/fcFinancialMonitor.routes.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireInternalToken } from '../middleware/requireInternalToken.js'

const router = Router()

// /auth/login is the only public endpoint — everything else requires a
// valid session. requireAuth also accepts the token as a query param,
// which is what lets the image/CSV/report routes below work from a plain
// <img>/<a> tag instead of only from axios calls that set a header.
router.use('/auth', authRoutes)

router.use('/dashboard', requireAuth, dashboardRoutes)
router.use('/jobs', requireAuth, jobsRoutes)
router.use('/reports', requireAuth, reportsRoutes)
router.use('/system', requireAuth, systemRoutes)
router.use('/notifications', requireAuth, notificationsRoutes)
router.use('/parcel-intelligence', requireAuth, parcelIntelligenceRoutes)
router.use('/employee-compliance', requireAuth, employeeComplianceRoutes)
router.use('/fc-financial-monitor', requireAuth, fcFinancialMonitorRoutes)

// Service-to-service only (the Python AI service calls these directly,
// never a browser) — gated by a shared secret instead of a user session.
router.use('/internal', requireInternalToken, internalRoutes)

export default router
