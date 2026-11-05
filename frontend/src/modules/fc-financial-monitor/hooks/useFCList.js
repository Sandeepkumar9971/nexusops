import { useEffect, useState } from 'react'
import { listFCs } from '../services/fcFinancialApi'

export function useFCList(filters) {
  const [state, setState] = useState({ status: 'loading', fcs: [], error: null })

  useEffect(() => {
    let cancelled = false
    setState((prev) => ({ ...prev, status: 'loading' }))

    listFCs(filters)
      .then((fcs) => {
        if (!cancelled) setState({ status: 'success', fcs, error: null })
      })
      .catch((error) => {
        if (!cancelled) setState({ status: 'error', fcs: [], error })
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)])

  return state
}
