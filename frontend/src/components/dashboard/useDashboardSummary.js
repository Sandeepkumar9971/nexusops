import { useEffect, useState } from 'react'
import { fetchDashboardSummary } from '../../services/dashboardApi'

const EMPTY_SUMMARY = {
  totalImagesProcessed: 0,
  successfulExtractions: 0,
  failedExtractions: 0,
  totalProcessingJobs: 0,
  recentJobs: [],
}

// Until Phase 4 ships the Node API, this will always resolve to 'error'
// (connection refused) and the page falls back to the empty-state summary —
// which is also exactly what a real fresh installation should show.
export function useDashboardSummary() {
  const [state, setState] = useState({ status: 'loading', data: EMPTY_SUMMARY, error: null })

  useEffect(() => {
    let cancelled = false

    fetchDashboardSummary()
      .then((data) => {
        if (!cancelled) setState({ status: 'success', data, error: null })
      })
      .catch((error) => {
        if (!cancelled) setState({ status: 'error', data: EMPTY_SUMMARY, error })
      })

    return () => {
      cancelled = true
    }
  }, [])

  return state
}
