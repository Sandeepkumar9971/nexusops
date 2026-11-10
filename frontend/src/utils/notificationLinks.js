// Notification.moduleId uses the backend's module ids, which don't all
// match moduleRegistry's frontend ids 1:1 (e.g. "employee-compliance" vs.
// "compliance-verification") — this is the one place that translates a
// notification into where clicking it should go.
export function getNotificationLink(notification) {
  switch (notification.moduleId) {
    case 'parcel-intelligence':
      return '/modules/parcel-intelligence'
    case 'employee-compliance':
      return '/modules/compliance'
    case 'fc-financial-monitor':
      if (notification.type === 'FINANCIAL_CRITICAL_ANOMALY') return '/modules/fc-financial/anomalies'
      if (notification.type === 'FINANCIAL_DIGEST_READY') return '/modules/fc-financial/digests'
      return '/modules/fc-financial'
    default:
      return '/history'
  }
}
