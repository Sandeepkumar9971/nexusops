import apiClient from '../../../services/apiClient'
import { getToken } from '../../../services/authStorage'

export async function createComplianceBatch({ wagesheet, pfEcr, esicEcr }, onUploadProgress) {
  const formData = new FormData()
  formData.append('wagesheet', wagesheet)
  formData.append('pfEcr', pfEcr)
  formData.append('esicEcr', esicEcr)

  // Let the browser set Content-Type (with the multipart boundary) itself —
  // setting it manually here would strip the boundary and break parsing.
  const { data } = await apiClient.post('/employee-compliance/batches', formData, { onUploadProgress })
  return data
}

export async function getJobStatus(jobId) {
  const { data } = await apiClient.get(`/jobs/${jobId}`)
  return data.job
}

export async function getBatchResults(jobId) {
  const { data } = await apiClient.get(`/employee-compliance/batches/${jobId}/results`)
  return data.results
}

export async function getDashboardSummary() {
  const { data } = await apiClient.get('/employee-compliance/dashboard')
  return data
}

// Report download goes through a plain <a href> (see ComplianceProcessingPanel),
// which can't send an Authorization header — the token travels as a query
// param instead, same pattern as parcel-intelligence's image/export routes.
export function getExportUrl(jobId) {
  return `${apiClient.defaults.baseURL}/employee-compliance/batches/${jobId}/export.xlsx?token=${getToken()}`
}
