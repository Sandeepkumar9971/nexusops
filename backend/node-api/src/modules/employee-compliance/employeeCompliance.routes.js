import { Router } from 'express'
import { assignUploadBatchId } from '../../middleware/assignUploadBatchId.js'
import { createMultiFieldUploadMiddleware } from '../../services/fileStorageService.js'
import { createBatch, listResults, exportXlsx, getDashboardSummary } from './employeeCompliance.controller.js'

const EXCEL_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
]
const PDF_MIME_TYPES = ['application/pdf']
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024

const upload = createMultiFieldUploadMiddleware({
  subfolder: 'employee-compliance',
  fields: [
    {
      name: 'wagesheet',
      allowedMimeTypes: EXCEL_MIME_TYPES,
      allowedExtensions: ['.xlsx', '.xls'],
      maxFileSizeBytes: MAX_FILE_SIZE_BYTES,
    },
    {
      name: 'pfEcr',
      allowedMimeTypes: PDF_MIME_TYPES,
      allowedExtensions: ['.pdf'],
      maxFileSizeBytes: MAX_FILE_SIZE_BYTES,
    },
    {
      name: 'esicEcr',
      allowedMimeTypes: PDF_MIME_TYPES,
      allowedExtensions: ['.pdf'],
      maxFileSizeBytes: MAX_FILE_SIZE_BYTES,
    },
  ],
})

const router = Router()

router.get('/dashboard', getDashboardSummary)
router.post('/batches', assignUploadBatchId, upload, createBatch)
router.get('/batches/:jobId/results', listResults)
router.get('/batches/:jobId/export.xlsx', exportXlsx)

export default router
