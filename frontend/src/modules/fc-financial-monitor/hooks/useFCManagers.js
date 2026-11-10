import { useCallback, useEffect, useState } from 'react'
import { listFCManagers, upsertFCManager } from '../services/fcFinancialApi'

export function useFCManagers() {
  const [state, setState] = useState({ status: 'loading', managers: [], error: null })

  const load = useCallback(() => {
    setState((prev) => ({ ...prev, status: 'loading' }))
    listFCManagers()
      .then((managers) => setState({ status: 'success', managers, error: null }))
      .catch((error) => setState({ status: 'error', managers: [], error }))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const save = useCallback(
    async (fcName, contact) => {
      await upsertFCManager(fcName, contact)
      load()
    },
    [load],
  )

  return { ...state, save }
}
