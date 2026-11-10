import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthProvider'
import { useToast } from './ToastProvider'
import { getToken } from '../../services/authStorage'
import { listNotifications, getUnreadCount, markNotificationRead, markAllNotificationsRead } from '../../services/notificationApi'

const NotificationContext = createContext(null)

const SEVERITY_TO_TOAST_VARIANT = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  CRITICAL: 'error',
}

export function NotificationProvider({ children }) {
  const { status } = useAuth()
  const { notify: showToast } = useToast()
  const [recent, setRecent] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const socketRef = useRef(null)

  const refreshUnreadCount = useCallback(() => {
    getUnreadCount()
      .then(setUnreadCount)
      .catch(() => {})
  }, [])

  const loadRecent = useCallback(() => {
    listNotifications({ limit: 10 })
      .then((data) => setRecent(data.notifications))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (status !== 'authenticated') return undefined

    loadRecent()
    refreshUnreadCount()

    const socketBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api').replace(/\/api\/?$/, '')
    const socket = io(socketBaseUrl, { auth: { token: getToken() } })
    socketRef.current = socket

    socket.on('notification:new', (notification) => {
      setRecent((prev) => [notification, ...prev].slice(0, 10))
      setUnreadCount((count) => count + 1)
      showToast(notification.message, { title: notification.title, variant: SEVERITY_TO_TOAST_VARIANT[notification.severity] || 'info' })
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  const markRead = useCallback(async (id) => {
    await markNotificationRead(id)
    setRecent((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)))
    setUnreadCount((count) => Math.max(0, count - 1))
  }, [])

  const markAllRead = useCallback(async () => {
    await markAllNotificationsRead()
    setRecent((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
  }, [])

  return (
    <NotificationContext.Provider value={{ recent, unreadCount, markRead, markAllRead, refresh: loadRecent }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) throw new Error('useNotifications must be used within NotificationProvider')
  return context
}
