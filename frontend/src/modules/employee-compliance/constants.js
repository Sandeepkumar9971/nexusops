// Kept in sync with the limits enforced server-side in
// backend/node-api/src/modules/employee-compliance/employeeCompliance.routes.js
export const MAX_FILE_SIZE_MB = 20

export const EXCEL_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
]
export const PDF_MIME_TYPES = ['application/pdf']

// Browsers/OS combinations sometimes misreport Office files as a generic
// binary type — the backend falls back to checking the extension in that
// case, so the frontend accepts by extension here too rather than
// rejecting a file the server would actually accept.
export const EXCEL_ACCEPT = '.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel'
export const PDF_ACCEPT = '.pdf,application/pdf'

export const VERIFICATION_STATUS = {
  MATCHED: 'MATCHED',
  NAME_MISMATCH: 'NAME_MISMATCH',
  AMOUNT_MISMATCH: 'AMOUNT_MISMATCH',
  MISSING: 'MISSING',
  NEEDS_REVIEW: 'NEEDS_REVIEW',
}

export const VERIFICATION_STATUS_OPTIONS = Object.values(VERIFICATION_STATUS)

export const FILE_FIELDS = [
  {
    key: 'wagesheet',
    label: 'Vendor Wagesheet',
    hint: 'Excel file (.xlsx/.xls) with employee PF/ESIC deductions',
    accept: EXCEL_ACCEPT,
    mimeTypes: EXCEL_MIME_TYPES,
    extensions: ['.xlsx', '.xls'],
  },
  {
    key: 'pfEcr',
    label: 'PF ECR Filing',
    hint: 'PDF export from the EPFO ECR portal',
    accept: PDF_ACCEPT,
    mimeTypes: PDF_MIME_TYPES,
    extensions: ['.pdf'],
  },
  {
    key: 'esicEcr',
    label: 'ESIC ECR Filing',
    hint: 'PDF export from the ESIC portal',
    accept: PDF_ACCEPT,
    mimeTypes: PDF_MIME_TYPES,
    extensions: ['.pdf'],
  },
]

// Mirrors compliance_service.py's currentStage values, in pipeline order —
// drives the processing panel's step list.
export const PROCESSING_STAGES = [
  'Validating files',
  'Extracting wagesheet',
  'Extracting PF ECR',
  'Extracting ESIC ECR',
  'Matching identifiers',
  'Comparing names and contributions',
  'Generating report',
  'Done',
]
