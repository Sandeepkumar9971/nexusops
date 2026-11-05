import { useEffect, useState } from 'react'
import { getDashboardSummary } from '../services/employeeComplianceApi'

const EMPTY_SUMMARY = {
  totalBatches: 0,
  totalEmployees: 0,
  matchedEmployees: 0,
  needsAttention: 0,
  pfMismatchCount: 0,
  esicMismatchCount: 0,
  needsReviewCount: 0,
  recentBatches: [],
}

export function useComplianceDashboard() {
  const [state, setState] = useState({ status: 'loading', data: EMPTY_SUMMARY, error: null })

  useEffect(() => {
    let cancelled = false

    getDashboardSummary()
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
