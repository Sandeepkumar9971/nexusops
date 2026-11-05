import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import PageHeader from '../../../components/common/PageHeader'
import Button from '../../../components/common/Button'
import Card from '../../../components/common/Card'
import Spinner from '../../../components/common/Spinner'
import TargetConfigTable from '../components/TargetConfigTable'
import { useTargets } from '../hooks/useTargets'

export default function TargetConfigurationPage() {
  const { status, targets, save } = useTargets()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Target Configuration"
        subtitle="Target ranges used by anomaly detection — update these without any code change."
        actions={
          <Button as={Link} to="/modules/fc-financial" variant="ghost" size="sm">
            <ArrowLeft size={14} />
            Back to Dashboard
          </Button>
        }
      />

      {status === 'loading' ? (
        <Card className="flex items-center justify-center">
          <Spinner label="Loading targets…" />
        </Card>
      ) : (
        <TargetConfigTable targets={targets} onSave={save} />
      )}
    </div>
  )
}
