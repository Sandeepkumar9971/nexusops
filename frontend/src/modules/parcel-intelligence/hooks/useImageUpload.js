import { useCallback, useState } from 'react'
import { MAX_FILE_SIZE_MB, MAX_FILES, ACCEPTED_MIME_TYPES } from '../constants'

let nextId = 0

function validateFile(file) {
  if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
    return `Unsupported file type (${file.type || 'unknown'}). Only JPG/PNG allowed.`
  }
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return `File is larger than ${MAX_FILE_SIZE_MB}MB.`
  }
  return null
}

export function useImageUpload() {
  const [files, setFiles] = useState([])
  const [limitError, setLimitError] = useState(null)

  const addFiles = useCallback((fileList) => {
    const incoming = Array.from(fileList)
    setLimitError(null)

    setFiles((prev) => {
      const availableSlots = Math.max(MAX_FILES - prev.length, 0)
      const accepted = incoming.slice(0, availableSlots)

      if (incoming.length > accepted.length) {
        setLimitError(
          `Only ${MAX_FILES} images allowed per batch — ${incoming.length - accepted.length} file(s) skipped.`,
        )
      }

      const mapped = accepted.map((file) => ({
        id: `${Date.now()}-${nextId++}`,
        file,
        previewUrl: URL.createObjectURL(file),
        error: validateFile(file),
      }))

      return [...prev, ...mapped]
    })
  }, [])

  const removeFile = useCallback((id) => {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((f) => f.id !== id)
    })
  }, [])

  const clearFiles = useCallback(() => {
    setFiles((prev) => {
      prev.forEach((f) => URL.revokeObjectURL(f.previewUrl))
      return []
    })
  }, [])

  const validFiles = files.filter((f) => !f.error)
  const hasErrors = files.some((f) => f.error)

  return { files, addFiles, removeFile, clearFiles, limitError, validFiles, hasErrors }
}
