import { useCallback, useEffect, useState } from 'react'
import { listTargets, upsertTarget } from '../services/fcFinancialApi'

export function useTargets() {
  const [state, setState] = useState({ status: 'loading', targets: [], error: null })

  const load = useCallback(() => {
    setState((prev) => ({ ...prev, status: 'loading' }))
    listTargets()
      .then((targets) => setState({ status: 'success', targets, error: null }))
      .catch((error) => setState({ status: 'error', targets: [], error }))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const save = useCallback(
    async (metric, { minimum, maximum }) => {
      await upsertTarget(metric, { minimum, maximum })
      load()
    },
    [load],
  )

  return { ...state, save }
}
