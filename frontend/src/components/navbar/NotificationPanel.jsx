import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck } from 'lucide-react'
import { useNotifications } from '../../app/providers/NotificationProvider'
import StatusBadge from '../common/StatusBadge'
import EmptyState from '../common/EmptyState'
import { getNotificationLink } from '../../utils/notificationLinks'

function timeAgo(dateString) {
  const diffMs = Date.now() - new Date(dateString).getTime()
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function NotificationPanel() {
  const navigate = useNavigate()
  const { recent, unreadCount, markRead, markAllRead } = useNotifications()
  const [open, setOpen] = useState(false)
  const panelRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleItemClick = async (notification) => {
    if (!notification.read) await markRead(notification._id)
    setOpen(false)
    navigate(getNotificationLink(notification))
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-100"
        aria-label="Notifications"
      >
        <Bell size={19} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 w-80 animate-scale-in overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-soft-lg dark:border-white/10 dark:bg-[rgba(22,34,53,0.97)] dark:backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5 dark:border-white/10">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Notifications</p>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead()}
                className="flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-cyan-400"
              >
                <CheckCheck size={12} /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {recent.length === 0 && (
              <div className="p-4">
                <EmptyState icon={Bell} title="No notifications yet." description="You'll see processing updates and alerts here." />
              </div>
            )}
            {recent.map((notification) => (
              <button
                key={notification._id}
                onClick={() => handleItemClick(notification)}
                className={`block w-full border-b border-slate-50 px-3 py-2.5 text-left transition-colors last:border-0 hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5 ${
                  !notification.read ? 'bg-blue-50/40 dark:bg-cyan-500/5' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{notification.title}</p>
                  <StatusBadge status={notification.severity} />
                </div>
                <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{notification.message}</p>
                <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">{timeAgo(notification.createdAt)}</p>
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              setOpen(false)
              navigate('/notifications')
            }}
            className="block w-full border-t border-slate-100 px-3 py-2 text-center text-xs font-medium text-blue-600 hover:bg-slate-50 dark:border-white/10 dark:text-cyan-400 dark:hover:bg-white/5"
          >
            View all notifications
          </button>
        </div>
      )}
    </div>
  )
}
