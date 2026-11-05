import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import ComplianceUploadWorkspace from '../components/ComplianceUploadWorkspace'
import ComplianceProcessingPanel from '../components/ComplianceProcessingPanel'
import PageHeader from '../../../components/common/PageHeader'
import Button from '../../../components/common/Button'

const STORAGE_KEY = 'employee-compliance:activeJobId'

export default function ComplianceWorkflowPage() {
  const { batchId } = useParams()
  const navigate = useNavigate()
  const [activeJobId, setActiveJobId] = useState(() => batchId || localStorage.getItem(STORAGE_KEY))

  // A direct link to an existing batch (e.g. from the dashboard's recent
  // batches list) should always show that batch, even if a different
  // in-progress batch was left in localStorage.
  useEffect(() => {
    if (batchId) setActiveJobId(batchId)
  }, [batchId])

  const handleBatchCreated = (job) => {
    localStorage.setItem(STORAGE_KEY, job._id)
    setActiveJobId(job._id)
  }

  const handleStartNew = () => {
    localStorage.removeItem(STORAGE_KEY)
    setActiveJobId(null)
    navigate('/modules/compliance/new')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employee Compliance Verification"
        subtitle="Upload a wagesheet with its PF and ESIC ECR filings to verify contributions."
        actions={
          <Button as={Link} to="/modules/compliance" variant="ghost" size="sm">
            <ArrowLeft size={14} />
            Back to Dashboard
          </Button>
        }
      />

      {activeJobId ? (
        <ComplianceProcessingPanel jobId={activeJobId} onStartNew={handleStartNew} />
      ) : (
        <ComplianceUploadWorkspace onBatchCreated={handleBatchCreated} />
      )}
    </div>
  )
}
