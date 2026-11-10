import Notification from '../../models/Notification.js'
import { asyncHandler } from '../../middleware/asyncHandler.js'
import { getUnreadCount } from '../../services/notificationService.js'

export const listNotifications = asyncHandler(async (req, res) => {
  const { read, severity, moduleId, page = 1, limit = 25 } = req.query
  const filter = { userId: req.user.id }
  if (read === 'true') filter.read = true
  if (read === 'false') filter.read = false
  if (severity) filter.severity = severity
  if (moduleId) filter.moduleId = moduleId

  const pageNum = Math.max(1, parseInt(page, 10) || 1)
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25))

  const [notifications, total] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Notification.countDocuments(filter),
  ])

  res.json({ notifications, total, page: pageNum, limit: limitNum })
})

export const getUnreadCountHandler = asyncHandler(async (req, res) => {
  const count = await getUnreadCount(req.user.id)
  res.json({ count })
})

export const markRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.id },
    { read: true, readAt: new Date() },
    { new: true },
  )
  if (!notification) {
    res.status(404)
    throw new Error('Notification not found.')
  }
  res.json({ notification })
})

export const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ userId: req.user.id, read: false }, { read: true, readAt: new Date() })
  res.json({ success: true })
})
