import { createBrowserRouter } from 'react-router-dom'
import AppLayout from '../layouts/AppLayout'
import ProtectedRoute from './ProtectedRoute'
import LoginPage from '../../pages/LoginPage'
import OverviewPage from '../../pages/OverviewPage'
import ProcessingHistoryPage from '../../pages/ProcessingHistoryPage'
import ReportsPage from '../../pages/ReportsPage'
import SettingsPage from '../../pages/SettingsPage'
import ComingSoonPage from '../../pages/ComingSoonPage'
import NotFoundPage from '../../pages/NotFoundPage'
import ParcelIntelligencePage from '../../modules/parcel-intelligence/pages/ParcelIntelligencePage'
import ComplianceDashboardPage from '../../modules/employee-compliance/pages/ComplianceDashboardPage'
import ComplianceWorkflowPage from '../../modules/employee-compliance/pages/ComplianceWorkflowPage'
import FinancialDashboardPage from '../../modules/fc-financial-monitor/pages/FinancialDashboardPage'
import FinancialUploadPage from '../../modules/fc-financial-monitor/pages/FinancialUploadPage'
import FCDetailPage from '../../modules/fc-financial-monitor/pages/FCDetailPage'
import AnomalyManagementPage from '../../modules/fc-financial-monitor/pages/AnomalyManagementPage'
import DailyDigestPage from '../../modules/fc-financial-monitor/pages/DailyDigestPage'
import TargetConfigurationPage from '../../modules/fc-financial-monitor/pages/TargetConfigurationPage'
import { moduleRegistry, MODULE_STATUS } from '../../config/moduleRegistry'

// Maps an active module's id to its real page component. A module with
// no entry here (or with status !== ACTIVE) falls back to ComingSoonPage.
// This is the ONLY place a new active module's page needs to be wired in.
const moduleRouteComponents = {
  'parcel-intelligence': ParcelIntelligencePage,
  'compliance-verification': ComplianceDashboardPage,
  'fc-financial-monitor': FinancialDashboardPage,
}

function ModuleRouteElement({ mod }) {
  const Component = moduleRouteComponents[mod.id]
  if (mod.status === MODULE_STATUS.ACTIVE && Component) {
    return <Component />
  }
  return <ComingSoonPage module={mod} />
}

const moduleRoutes = moduleRegistry.map((mod) => ({
  path: mod.route.replace(/^\//, ''),
  element: <ModuleRouteElement mod={mod} />,
}))

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <OverviewPage /> },
      ...moduleRoutes,
      { path: 'modules/compliance/new', element: <ComplianceWorkflowPage /> },
      { path: 'modules/compliance/batches/:batchId', element: <ComplianceWorkflowPage /> },
      { path: 'modules/fc-financial/upload', element: <FinancialUploadPage /> },
      { path: 'modules/fc-financial/batches/:batchId', element: <FinancialUploadPage /> },
      { path: 'modules/fc-financial/fcs/:fcName', element: <FCDetailPage /> },
      { path: 'modules/fc-financial/anomalies', element: <AnomalyManagementPage /> },
      { path: 'modules/fc-financial/digests', element: <DailyDigestPage /> },
      { path: 'modules/fc-financial/targets', element: <TargetConfigurationPage /> },
      { path: 'history', element: <ProcessingHistoryPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
