import apiClient from './apiClient'

export async function listNotifications(params = {}) {
  const { data } = await apiClient.get('/notifications', { params })
  return data
}

export async function getUnreadCount() {
  const { data } = await apiClient.get('/notifications/unread-count')
  return data.count
}

export async function markNotificationRead(id) {
  const { data } = await apiClient.patch(`/notifications/${id}/read`)
  return data.notification
}

export async function markAllNotificationsRead() {
  await apiClient.patch('/notifications/read-all')
}
