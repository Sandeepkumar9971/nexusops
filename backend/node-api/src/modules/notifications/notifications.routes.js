import { Router } from 'express'
import { listNotifications, getUnreadCountHandler, markRead, markAllRead } from './notifications.controller.js'

const router = Router()

router.get('/', listNotifications)
router.get('/unread-count', getUnreadCountHandler)
router.patch('/read-all', markAllRead)
router.patch('/:id/read', markRead)

export default router
