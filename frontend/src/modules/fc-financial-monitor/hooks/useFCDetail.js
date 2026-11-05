import { useEffect, useState } from 'react'
import { getFCDetail } from '../services/fcFinancialApi'

export function useFCDetail(fcName, filters = {}) {
  const [state, setState] = useState({ status: 'loading', data: null, error: null })

  useEffect(() => {
    let cancelled = false
    setState((prev) => ({ ...prev, status: 'loading' }))

    getFCDetail(fcName, filters)
      .then((data) => {
        if (!cancelled) setState({ status: 'success', data, error: null })
      })
      .catch((error) => {
        if (!cancelled) setState({ status: 'error', data: null, error })
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fcName, JSON.stringify(filters)])

  return state
}
