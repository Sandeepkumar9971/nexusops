import { Router } from 'express'
import { listReports, downloadReport } from './reports.controller.js'

const router = Router()

router.get('/', listReports)
router.get('/:id/download', downloadReport)

export default router
