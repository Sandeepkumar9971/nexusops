import { Router } from 'express'
import { listJobs, getJob, retryJobHandler } from './jobs.controller.js'

const router = Router()

router.get('/', listJobs)
router.get('/:id', getJob)
router.post('/:id/retry', retryJobHandler)

export default router
