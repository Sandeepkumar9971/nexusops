import { useEffect, useState } from 'react'
import { listAnomalies } from '../services/fcFinancialApi'

export function useAnomalyList(filters) {
  const [state, setState] = useState({ status: 'loading', anomalies: [], error: null })
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setState((prev) => ({ ...prev, status: 'loading' }))

    listAnomalies(filters)
      .then((anomalies) => {
        if (!cancelled) setState({ status: 'success', anomalies, error: null })
      })
      .catch((error) => {
        if (!cancelled) setState({ status: 'error', anomalies: [], error })
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters), refreshKey])

  const refresh = () => setRefreshKey((k) => k + 1)

  return { ...state, refresh }
}
