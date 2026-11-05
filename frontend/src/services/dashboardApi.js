import apiClient from './apiClient'

// Will hit the real endpoint once the Node API (Phase 4) implements it.
// Expected shape:
// { totalImagesProcessed, successfulExtractions, failedExtractions,
//   totalProcessingJobs, recentJobs: [{ id, moduleId, uploadedFileName,
//   totalImages, status, createdAt }] }
export async function fetchDashboardSummary() {
  const { data } = await apiClient.get('/dashboard/summary')
  return data
}
