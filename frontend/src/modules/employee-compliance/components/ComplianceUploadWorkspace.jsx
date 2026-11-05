import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import FileUploadCard from './FileUploadCard'
import Button from '../../../components/common/Button'
import { useComplianceUpload } from '../hooks/useComplianceUpload'
import { createComplianceBatch } from '../services/employeeComplianceApi'
import { FILE_FIELDS } from '../constants'

export default function ComplianceUploadWorkspace({ onBatchCreated }) {
  const { files, errors, setFile, clearFile, isComplete } = useComplianceUpload()
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  const handleStart = async () => {
    setSubmitError(null)
    setSubmitting(true)
    try {
      const { job } = await createComplianceBatch(files)
      onBatchCreated(job)
    } catch (err) {
      setSubmitError(
        err.response?.data?.error?.message || 'Failed to start verification. Is the Node API running?',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {FILE_FIELDS.map((field) => (
          <FileUploadCard
            key={field.key}
            field={field}
            file={files[field.key]}
            error={errors[field.key]}
            onSelect={(file) => setFile(field.key, file)}
            onClear={() => clearFile(field.key)}
          />
        ))}
      </div>

      {submitError && (
        <p className="flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400">
          <AlertTriangle size={14} className="shrink-0" />
          {submitError}
        </p>
      )}

      <Button onClick={handleStart} disabled={!isComplete} loading={submitting}>
        {submitting ? 'Starting…' : 'Start Verification'}
      </Button>
    </div>
  )
}
