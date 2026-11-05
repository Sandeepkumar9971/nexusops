import { Router } from 'express'
import { getSystemHealth } from './system.controller.js'

const router = Router()

router.get('/health', getSystemHealth)

export default router
