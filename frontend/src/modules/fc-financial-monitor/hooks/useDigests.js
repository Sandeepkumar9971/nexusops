import { useEffect, useState } from 'react'
import { listDigests } from '../services/fcFinancialApi'

export function useDigests(filters) {
  const [state, setState] = useState({ status: 'loading', date: null, digests: [], error: null })

  useEffect(() => {
    let cancelled = false
    setState((prev) => ({ ...prev, status: 'loading' }))

    listDigests(filters)
      .then(({ date, digests }) => {
        if (!cancelled) setState({ status: 'success', date, digests, error: null })
      })
      .catch((error) => {
        if (!cancelled) setState({ status: 'error', date: null, digests: [], error })
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)])

  return state
}
