import { Router } from 'express'
import { assignUploadBatchId } from '../../middleware/assignUploadBatchId.js'
import { createUploadMiddleware } from '../../services/fileStorageService.js'
import { createJob, listResults, serveImage, exportCsv } from './parcelIntelligence.controller.js'

const upload = createUploadMiddleware({
  subfolder: 'parcel-intelligence',
  allowedMimeTypes: ['image/jpeg', 'image/png'],
  maxFileSizeBytes: 20 * 1024 * 1024,
  fieldName: 'images',
  maxFiles: 50,
})

const router = Router()

router.post('/jobs', assignUploadBatchId, upload, createJob)
router.get('/jobs/:jobId/results', listResults)
router.get('/jobs/:jobId/export.csv', exportCsv)
router.get('/jobs/:jobId/images/:filename', serveImage)

export default router
