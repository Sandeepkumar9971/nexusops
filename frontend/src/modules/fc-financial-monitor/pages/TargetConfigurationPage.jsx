import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import PageHeader from '../../../components/common/PageHeader'
import Button from '../../../components/common/Button'
import Card from '../../../components/common/Card'
import Spinner from '../../../components/common/Spinner'
import TargetConfigTable from '../components/TargetConfigTable'
import FCManagerTable from '../components/FCManagerTable'
import { useTargets } from '../hooks/useTargets'
import { useFCManagers } from '../hooks/useFCManagers'

export default function TargetConfigurationPage() {
  const { status, targets, save } = useTargets()
  const { status: managersStatus, managers, save: saveManager } = useFCManagers()

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

      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-100">FC Manager Contacts</h2>
        <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
          Alerts and daily digests are routed to the FC's own manager when configured here, falling back to the global
          email/Slack/WhatsApp defaults otherwise.
        </p>
        {managersStatus === 'loading' ? (
          <Card className="flex items-center justify-center">
            <Spinner label="Loading FC managers…" />
          </Card>
        ) : (
          <FCManagerTable managers={managers} onSave={saveManager} />
        )}
      </div>
    </div>
  )
}
