import { Router } from 'express'
import { assignUploadBatchId } from '../../middleware/assignUploadBatchId.js'
import { createMultiFieldUploadMiddleware } from '../../services/fileStorageService.js'
import { previewBatch, remapPreview, createBatch, listBatches, exportXlsx, exportCsv } from './controllers/batch.controller.js'
import { getDashboardSummary } from './controllers/dashboard.controller.js'
import { listFCs, getFCDetail } from './controllers/fc.controller.js'
import { listAnomalies, getAnomalyDetail, updateAnomalyStatus } from './controllers/anomaly.controller.js'
import { listTargets, upsertTarget } from './controllers/target.controller.js'
import { listDigests, listAvailableDates } from './controllers/digest.controller.js'
import { listAlerts } from './controllers/alert.controller.js'
import { listFCManagers, upsertFCManager } from './controllers/fcManager.controller.js'

const FINANCIAL_FILE_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
  'text/csv',
  'application/csv',
  'text/plain', // some OSes report .csv this generically
]
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024

// Uses the multi-field upload middleware with a single field purely for its
// extension-fallback MIME validation (Excel/CSV MIME reporting is just as
// unreliable across clients as it was for Employee Compliance's wagesheet).
const upload = createMultiFieldUploadMiddleware({
  subfolder: 'fc-financial-monitor/staging',
  fields: [
    {
      name: 'file',
      allowedMimeTypes: FINANCIAL_FILE_MIME_TYPES,
      allowedExtensions: ['.xlsx', '.xls', '.csv'],
      maxFileSizeBytes: MAX_FILE_SIZE_BYTES,
    },
  ],
})

// createMultiFieldUploadMiddleware populates req.files.file[0]; the batch
// controller expects the simpler req.file shape multer's .single() would
// give — this tiny adapter avoids changing the shared upload service for
// one module's convenience.
function adaptSingleFile(req, res, next) {
  req.file = req.files?.file?.[0]
  next()
}

const router = Router()

router.get('/dashboard', getDashboardSummary)

router.post('/preview', assignUploadBatchId, upload, adaptSingleFile, previewBatch)
router.post('/preview-remap', remapPreview)
router.post('/batches', createBatch)
router.get('/batches', listBatches)
router.get('/batches/:jobId/export.xlsx', exportXlsx)
router.get('/batches/:jobId/export.csv', exportCsv)

router.get('/fcs', listFCs)
router.get('/fcs/:fcName', getFCDetail)

router.get('/anomalies', listAnomalies)
router.get('/anomalies/:id', getAnomalyDetail)
router.patch('/anomalies/:id/status', updateAnomalyStatus)

router.get('/targets', listTargets)
router.put('/targets/:metric', upsertTarget)

router.get('/digests', listDigests)
router.get('/digest-dates', listAvailableDates)

router.get('/alerts', listAlerts)

router.get('/managers', listFCManagers)
router.put('/managers/:fcName', upsertFCManager)

export default router
