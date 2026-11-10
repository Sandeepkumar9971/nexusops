import apiClient from '../../../services/apiClient'
import { getToken } from '../../../services/authStorage'

export async function previewFinancialFile(file, defaultFcName) {
  const formData = new FormData()
  formData.append('file', file)
  if (defaultFcName) formData.append('defaultFcName', defaultFcName)
  // Let the browser set Content-Type (with the multipart boundary) itself.
  const { data } = await apiClient.post('/fc-financial-monitor/preview', formData)
  return data
}

export async function remapFinancialPreview({ stagingId, fileName, columnMapping, defaultFcName }) {
  const { data } = await apiClient.post('/fc-financial-monitor/preview-remap', {
    stagingId,
    fileName,
    columnMapping,
    defaultFcName,
  })
  return data
}

export async function createFinancialBatch({ stagingId, fileName, columnMapping, defaultFcName }) {
  const { data } = await apiClient.post('/fc-financial-monitor/batches', { stagingId, fileName, columnMapping, defaultFcName })
  return data
}

export async function getJobStatus(jobId) {
  const { data } = await apiClient.get(`/jobs/${jobId}`)
  return data.job
}

export async function getDashboardSummary() {
  const { data } = await apiClient.get('/fc-financial-monitor/dashboard')
  return data
}

export async function listFCs(params = {}) {
  const { data } = await apiClient.get('/fc-financial-monitor/fcs', { params })
  return data.fcs
}

export async function getFCDetail(fcName, params = {}) {
  const { data } = await apiClient.get(`/fc-financial-monitor/fcs/${encodeURIComponent(fcName)}`, { params })
  return data
}

export async function listAnomalies(params = {}) {
  const { data } = await apiClient.get('/fc-financial-monitor/anomalies', { params })
  return data.anomalies
}

export async function getAnomalyDetail(id) {
  const { data } = await apiClient.get(`/fc-financial-monitor/anomalies/${id}`)
  return data
}

export async function updateAnomalyStatus(id, { status, reason }) {
  const { data } = await apiClient.patch(`/fc-financial-monitor/anomalies/${id}/status`, { status, reason })
  return data.anomaly
}

export async function listTargets() {
  const { data } = await apiClient.get('/fc-financial-monitor/targets')
  return data.targets
}

export async function upsertTarget(metric, { minimum, maximum }) {
  const { data } = await apiClient.put(`/fc-financial-monitor/targets/${metric}`, { minimum, maximum })
  return data.target
}

export async function listFCManagers() {
  const { data } = await apiClient.get('/fc-financial-monitor/managers')
  return data.managers
}

export async function upsertFCManager(fcName, contact) {
  const { data } = await apiClient.put(`/fc-financial-monitor/managers/${encodeURIComponent(fcName)}`, contact)
  return data.manager
}

export async function listDigests(params = {}) {
  const { data } = await apiClient.get('/fc-financial-monitor/digests', { params })
  return data
}

export async function listDigestDates() {
  const { data } = await apiClient.get('/fc-financial-monitor/digest-dates')
  return data.dates
}

export async function listAlerts(params = {}) {
  const { data } = await apiClient.get('/fc-financial-monitor/alerts', { params })
  return data.alerts
}

// Report downloads go through a plain <a href>, which can't send an
// Authorization header — the token travels as a query param instead, same
// pattern as every other module's report/image/export routes.
export function getExportXlsxUrl(jobId) {
  return `${apiClient.defaults.baseURL}/fc-financial-monitor/batches/${jobId}/export.xlsx?token=${getToken()}`
}

export function getExportCsvUrl(jobId) {
  return `${apiClient.defaults.baseURL}/fc-financial-monitor/batches/${jobId}/export.csv?token=${getToken()}`
}
