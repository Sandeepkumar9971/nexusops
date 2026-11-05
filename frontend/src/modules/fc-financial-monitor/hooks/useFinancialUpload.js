import { useCallback, useState } from 'react'
import { previewFinancialFile, remapFinancialPreview, createFinancialBatch } from '../services/fcFinancialApi'

export function useFinancialUpload() {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [previewing, setPreviewing] = useState(false)
  const [previewError, setPreviewError] = useState(null)
  const [columnMapping, setColumnMapping] = useState({})
  const [defaultFcName, setDefaultFcName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  const selectFile = useCallback(async (selected) => {
    setFile(selected)
    setPreview(null)
    setPreviewError(null)
    setColumnMapping({})
    setPreviewing(true)
    try {
      const data = await previewFinancialFile(selected, defaultFcName)
      setPreview(data)
    } catch (err) {
      setPreviewError(err.response?.data?.error?.message || 'Failed to preview file. Is the Python AI service running?')
    } finally {
      setPreviewing(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const remapColumn = useCallback(
    async (field, header) => {
      const nextMapping = { ...columnMapping, [field]: header }
      setColumnMapping(nextMapping)
      if (!preview) return
      setPreviewing(true)
      setPreviewError(null)
      try {
        const data = await remapFinancialPreview({
          stagingId: preview.stagingId,
          fileName: preview.fileName,
          columnMapping: nextMapping,
          defaultFcName,
        })
        setPreview({ ...preview, ...data })
      } catch (err) {
        setPreviewError(err.response?.data?.error?.message || 'Failed to re-preview file with the new mapping.')
      } finally {
        setPreviewing(false)
      }
    },
    [columnMapping, preview, defaultFcName],
  )

  // A file with no FC Name/ID column at all (a single-facility export) is
  // never going to find an FC identifier by remapping an existing column —
  // there isn't one. This applies one fixed name to every row instead, and
  // re-previews immediately so the user sees it take effect without a
  // separate "apply" step.
  const setFcNameOverride = useCallback(
    async (name) => {
      setDefaultFcName(name)
      if (!preview) return
      setPreviewing(true)
      setPreviewError(null)
      try {
        const data = await remapFinancialPreview({
          stagingId: preview.stagingId,
          fileName: preview.fileName,
          columnMapping,
          defaultFcName: name,
        })
        setPreview({ ...preview, ...data })
      } catch (err) {
        setPreviewError(err.response?.data?.error?.message || 'Failed to re-preview file with that FC name.')
      } finally {
        setPreviewing(false)
      }
    },
    [preview, columnMapping],
  )

  const reset = useCallback(() => {
    setFile(null)
    setPreview(null)
    setPreviewError(null)
    setColumnMapping({})
    setDefaultFcName('')
    setSubmitError(null)
  }, [])

  const submitBatch = useCallback(async () => {
    if (!preview) return null
    setSubmitting(true)
    setSubmitError(null)
    try {
      const { job } = await createFinancialBatch({
        stagingId: preview.stagingId,
        fileName: preview.fileName,
        columnMapping: Object.keys(columnMapping).length > 0 ? columnMapping : null,
        defaultFcName: defaultFcName || null,
      })
      return job
    } catch (err) {
      setSubmitError(err.response?.data?.error?.message || 'Failed to start processing. Is the Node API running?')
      return null
    } finally {
      setSubmitting(false)
    }
  }, [preview, columnMapping, defaultFcName])

  return {
    file,
    preview,
    previewing,
    previewError,
    columnMapping,
    defaultFcName,
    setFcNameOverride,
    selectFile,
    remapColumn,
    reset,
    submitBatch,
    submitting,
    submitError,
  }
}
