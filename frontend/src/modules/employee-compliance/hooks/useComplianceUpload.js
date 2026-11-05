import { useCallback, useMemo, useState } from 'react'
import { FILE_FIELDS, MAX_FILE_SIZE_MB } from '../constants'

function validateFile(file, fieldConfig) {
  const name = file.name.toLowerCase()
  const extensionOk = fieldConfig.extensions.some((ext) => name.endsWith(ext))
  // Browsers don't always report a precise MIME type for Office documents,
  // so a recognized extension is accepted even when the MIME type is generic —
  // mirrors the fallback the backend applies for the same reason.
  const mimeOk = fieldConfig.mimeTypes.includes(file.type)
  if (!extensionOk && !mimeOk) {
    return `Unsupported file type. Expected: ${fieldConfig.extensions.join(', ')}`
  }
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return `File is larger than ${MAX_FILE_SIZE_MB}MB.`
  }
  return null
}

const EMPTY_FILES = Object.fromEntries(FILE_FIELDS.map((f) => [f.key, null]))
const EMPTY_ERRORS = Object.fromEntries(FILE_FIELDS.map((f) => [f.key, null]))

export function useComplianceUpload() {
  const [files, setFiles] = useState(EMPTY_FILES)
  const [errors, setErrors] = useState(EMPTY_ERRORS)

  const setFile = useCallback((key, file) => {
    const fieldConfig = FILE_FIELDS.find((f) => f.key === key)
    const error = file ? validateFile(file, fieldConfig) : null
    setFiles((prev) => ({ ...prev, [key]: file }))
    setErrors((prev) => ({ ...prev, [key]: error }))
  }, [])

  const clearFile = useCallback((key) => {
    setFiles((prev) => ({ ...prev, [key]: null }))
    setErrors((prev) => ({ ...prev, [key]: null }))
  }, [])

  const isComplete = useMemo(
    () => FILE_FIELDS.every((f) => files[f.key] && !errors[f.key]),
    [files, errors],
  )

  return { files, errors, setFile, clearFile, isComplete }
}
