import { useState } from 'react'
import UploadWorkspace from '../components/UploadWorkspace'
import ProcessingPanel from '../components/ProcessingPanel'
import PageHeader from '../../../components/common/PageHeader'

const STORAGE_KEY = 'parcel-intelligence:activeJobId'

export default function ParcelIntelligencePage() {
  const [activeJobId, setActiveJobId] = useState(() => localStorage.getItem(STORAGE_KEY))

  const handleJobCreated = (job) => {
    localStorage.setItem(STORAGE_KEY, job._id)
    setActiveJobId(job._id)
  }

  const handleStartNew = () => {
    localStorage.removeItem(STORAGE_KEY)
    setActiveJobId(null)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parcel Image Intelligence"
        subtitle="Extract shipment information automatically from parcel photographs."
      />

      {activeJobId ? (
        <ProcessingPanel jobId={activeJobId} onStartNew={handleStartNew} />
      ) : (
        <UploadWorkspace onJobCreated={handleJobCreated} />
      )}
    </div>
  )
}
