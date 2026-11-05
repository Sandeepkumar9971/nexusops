import { Router } from 'express'
import { login, getMe, changePassword } from './auth.controller.js'
import { requireAuth } from '../../middleware/requireAuth.js'

const router = Router()

router.post('/login', login)
router.get('/me', requireAuth, getMe)
router.put('/change-password', requireAuth, changePassword)

export default router
