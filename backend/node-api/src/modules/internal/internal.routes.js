import { Router } from 'express'
import { createInternalNotification } from './internal.controller.js'

const router = Router()

router.post('/notifications', createInternalNotification)

export default router
