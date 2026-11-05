import apiClient from '../../../services/apiClient'

export async function createParcelJob(files, onUploadProgress) {
  const formData = new FormData()
  files.forEach((file) => formData.append('images', file))

  // Let the browser set Content-Type (with the multipart boundary) itself —
  // setting it manually here would strip the boundary and break parsing.
  const { data } = await apiClient.post('/parcel-intelligence/jobs', formData, { onUploadProgress })
  return data
}

export async function getJobStatus(jobId) {
  const { data } = await apiClient.get(`/jobs/${jobId}`)
  return data.job
}

export async function getJobResults(jobId) {
  const { data } = await apiClient.get(`/parcel-intelligence/jobs/${jobId}/results`)
  return data.results
}
