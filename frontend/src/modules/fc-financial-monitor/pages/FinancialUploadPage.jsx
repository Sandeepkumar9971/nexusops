import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import FinancialUploadWorkspace from '../components/FinancialUploadWorkspace'
import FinancialProcessingPanel from '../components/FinancialProcessingPanel'
import PageHeader from '../../../components/common/PageHeader'
import Button from '../../../components/common/Button'

const STORAGE_KEY = 'fc-financial-monitor:activeJobId'

export default function FinancialUploadPage() {
  const { batchId } = useParams()
  const navigate = useNavigate()
  const [activeJobId, setActiveJobId] = useState(() => batchId || localStorage.getItem(STORAGE_KEY))

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
    navigate('/modules/fc-financial/upload')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Upload Financial Data"
        subtitle="Upload daily revenue and cost data to calculate margins, detect anomalies, and generate alerts."
        actions={
          <Button as={Link} to="/modules/fc-financial" variant="ghost" size="sm">
            <ArrowLeft size={14} />
            Back to Dashboard
          </Button>
        }
      />

      {activeJobId ? (
        <FinancialProcessingPanel jobId={activeJobId} onStartNew={handleStartNew} />
      ) : (
        <FinancialUploadWorkspace onBatchCreated={handleBatchCreated} />
      )}
    </div>
  )
}
