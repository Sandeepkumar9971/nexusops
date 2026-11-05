import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import UploadDropzone from './UploadDropzone'
import ImagePreviewGrid from './ImagePreviewGrid'
import Button from '../../../components/common/Button'
import { useImageUpload } from '../hooks/useImageUpload'
import { createParcelJob } from '../services/parcelIntelligenceApi'
import { MAX_FILES } from '../constants'

export default function UploadWorkspace({ onJobCreated }) {
  const { files, addFiles, removeFile, limitError, validFiles, hasErrors } = useImageUpload()
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  const handleStart = async () => {
    setSubmitError(null)
    setSubmitting(true)
    try {
      const { job } = await createParcelJob(validFiles.map((f) => f.file))
      onJobCreated(job)
    } catch (err) {
      setSubmitError(
        err.response?.data?.error?.message || 'Failed to start processing. Is the Node API running?',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <UploadDropzone onFilesSelected={addFiles} />

      {limitError && (
        <p className="flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400">
          <AlertTriangle size={14} className="shrink-0" />
          {limitError}
        </p>
      )}

      {files.length > 0 && (
        <>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {files.length} / {MAX_FILES} image{files.length === 1 ? '' : 's'} selected
            {hasErrors && (
              <span className="ml-2 text-amber-600 dark:text-amber-400">
                — {files.length - validFiles.length} file{files.length - validFiles.length === 1 ? '' : 's'} will
                be skipped (see highlighted issues below)
              </span>
            )}
          </p>
          <ImagePreviewGrid files={files} onRemove={removeFile} />
        </>
      )}

      {submitError && (
        <p className="flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400">
          <AlertTriangle size={14} className="shrink-0" />
          {submitError}
        </p>
      )}

      <Button onClick={handleStart} disabled={validFiles.length === 0} loading={submitting}>
        {submitting ? 'Starting…' : `Start Processing (${validFiles.length})`}
      </Button>
    </div>
  )
}
