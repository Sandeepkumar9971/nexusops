import { useEffect, useState } from 'react'
import { getDashboardSummary } from '../services/fcFinancialApi'

const EMPTY_SUMMARY = {
  totalBatches: 0,
  totalFCs: 0,
  totalRevenue: 0,
  averageCm1Percentage: null,
  averageCm2Percentage: null,
  redFCs: 0,
  yellowFCs: 0,
  greenFCs: 0,
  blueFCs: 0,
  openAnomalies: 0,
}

export function useFinancialDashboard() {
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
