import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import Card from '../components/common/Card'
import EmptyState from '../components/common/EmptyState'
import ErrorState from '../components/common/ErrorState'
import Spinner from '../components/common/Spinner'
import Button from '../components/common/Button'
import StatusBadge from '../components/common/StatusBadge'
import FilterSelect from '../components/common/FilterSelect'
import { listNotifications, markNotificationRead, markAllNotificationsRead } from '../services/notificationApi'
import { getNotificationLink } from '../utils/notificationLinks'

const SEVERITY_OPTIONS = ['INFO', 'SUCCESS', 'WARNING', 'CRITICAL']
const MODULE_OPTIONS = [
  { value: 'parcel-intelligence', label: 'Parcel Image Intelligence' },
  { value: 'employee-compliance', label: 'Employee Compliance' },
  { value: 'fc-financial-monitor', label: 'FC Financial Monitor' },
]
const READ_OPTIONS = [
  { value: 'false', label: 'Unread only' },
  { value: 'true', label: 'Read only' },
]

export default function NotificationCenterPage() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState(null)
  const [error, setError] = useState(null)
  const [severity, setSeverity] = useState('')
  const [moduleId, setModuleId] = useState('')
  const [readFilter, setReadFilter] = useState('')

  const load = useCallback(() => {
    setNotifications(null)
    setError(null)
    listNotifications({ severity: severity || undefined, moduleId: moduleId || undefined, read: readFilter || undefined, limit: 100 })
      .then((data) => setNotifications(data.notifications))
      .catch(() => setError('Could not load notifications. Is the Node API running?'))
  }, [severity, moduleId, readFilter])

  useEffect(() => {
    load()
  }, [load])

  const handleItemClick = async (notification) => {
    if (!notification.read) {
      await markNotificationRead(notification._id)
      setNotifications((prev) => prev.map((n) => (n._id === notification._id ? { ...n, read: true } : n)))
    }
    navigate(getNotificationLink(notification))
  }

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead()
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notification Centre"
        subtitle="Processing updates and alerts across every module, in one place."
        actions={
          <Button variant="secondary" size="sm" onClick={handleMarkAllRead}>
            <CheckCheck size={14} /> Mark all read
          </Button>
        }
      />

      <div className="flex flex-wrap gap-3">
        <FilterSelect value={readFilter} onChange={(e) => setReadFilter(e.target.value)} options={READ_OPTIONS} placeholder="All" />
        <FilterSelect
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          options={SEVERITY_OPTIONS}
          placeholder="All severities"
        />
        <FilterSelect
          value={moduleId}
          onChange={(e) => setModuleId(e.target.value)}
          options={MODULE_OPTIONS}
          placeholder="All modules"
        />
      </div>

      {error && <ErrorState title="Could not load notifications." description="Is the Node API running?" />}
      {!notifications && !error && <Spinner label="Loading notifications…" />}

      {notifications && notifications.length === 0 && (
        <EmptyState icon={Bell} title="No notifications match these filters." description="Try clearing a filter above." />
      )}

      {notifications && notifications.length > 0 && (
        <Card padding="none" className="divide-y divide-slate-100 dark:divide-white/5">
          {notifications.map((notification) => (
            <button
              key={notification._id}
              onClick={() => handleItemClick(notification)}
              className={`block w-full px-4 py-3 text-left transition-colors hover:bg-slate-50/80 dark:hover:bg-white/[0.03] ${
                !notification.read ? 'bg-blue-50/30 dark:bg-cyan-500/5' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{notification.title}</p>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge status={notification.severity} />
                  {!notification.read && <span className="h-2 w-2 rounded-full bg-blue-500 dark:bg-cyan-400" />}
                </div>
              </div>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{notification.message}</p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                {notification.moduleId} · {new Date(notification.createdAt).toLocaleString()}
              </p>
            </button>
          ))}
        </Card>
      )}
    </div>
  )
}
