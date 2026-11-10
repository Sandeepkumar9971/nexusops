import Notification from '../models/Notification.js'
import { emitToUser } from './realtimeService.js'

// The one place every module (Node controller or the internal endpoint
// Python calls) creates a notification — guarantees dedup and the
// real-time push always happen together, so no call site can forget one.
export async function createNotification({ userId, moduleId, type, severity, title, message, jobId, relatedEntity, dedupeKey }) {
  let notification
  try {
    notification = await Notification.create({
      userId,
      moduleId,
      type,
      severity,
      title,
      message,
      jobId,
      relatedEntity,
      dedupeKey,
    })
  } catch (err) {
    // E11000 duplicate key on dedupeKey — this exact event was already
    // notified (e.g. a retried call); return the existing one instead of
    // erroring, so callers never need their own "did I already send this"
    // check.
    if (err.code === 11000) {
      return Notification.findOne({ dedupeKey })
    }
    throw err
  }

  emitToUser(userId, 'notification:new', notification.toObject())
  return notification
}

export async function getUnreadCount(userId) {
  return Notification.countDocuments({ userId, read: false })
}
