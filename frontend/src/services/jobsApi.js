import apiClient from './apiClient'
import { getToken } from './authStorage'

export async function listJobs(params = {}) {
  const { data } = await apiClient.get('/jobs', { params })
  return data
}

export async function retryJob(jobId) {
  const { data } = await apiClient.post(`/jobs/${jobId}/retry`)
  return data.job
}

export function getReportDownloadUrl(reportId) {
  return `${apiClient.defaults.baseURL}/reports/${reportId}/download?token=${getToken()}`
}
