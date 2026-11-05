import { Download } from 'lucide-react'
import Card from '../../../components/common/Card'
import StatusBadge from '../../../components/common/StatusBadge'
import Button from '../../../components/common/Button'
import { getExportXlsxUrl } from '../services/fcFinancialApi'

const DELIVERY_LABELS = {
  SENT: 'Sent',
  FAILED: 'Failed',
  PENDING_CONFIGURATION: 'Pending Configuration',
}

const DELIVERY_COLORS = {
  SENT: 'text-green-600 dark:text-green-400',
  FAILED: 'text-red-600 dark:text-red-400',
  PENDING_CONFIGURATION: 'text-slate-400 dark:text-slate-500',
}

export default function DigestCard({ digest }) {
  return (
    <Card padding="sm" className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{digest.fcName}</h3>
        <StatusBadge status={digest.overallStatus} />
      </div>

      <div className="grid grid-cols-3 gap-2 text-sm">
        <div>
          <p className="text-xs text-slate-400 dark:text-slate-500">Revenue</p>
          <p className="font-medium text-slate-900 tabular-nums dark:text-slate-100">₹{digest.revenue.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400 dark:text-slate-500">CM1</p>
          <p className="font-medium text-slate-900 tabular-nums dark:text-slate-100">
            ₹{digest.cm1.toLocaleString()} ({digest.cm1Percentage}%)
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-400 dark:text-slate-500">CM2</p>
          <p className="font-medium text-slate-900 tabular-nums dark:text-slate-100">
            ₹{digest.cm2.toLocaleString()} ({digest.cm2Percentage}%)
          </p>
        </div>
      </div>

      {digest.flaggedCosts?.length > 0 && (
        <div>
          <p className="text-xs text-slate-400 dark:text-slate-500">Flagged Costs</p>
          <p className="text-sm text-slate-700 dark:text-slate-300">{digest.flaggedCosts.join(', ')}</p>
        </div>
      )}

      {digest.insight && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
          <p className="font-medium text-slate-700 dark:text-slate-200">Key Insight</p>
          <p className="mt-1">{digest.insight.summary}</p>
          <p className="mt-2 font-medium text-slate-700 dark:text-slate-200">Recommended Action</p>
          <p className="mt-1">{digest.insight.recommendedAction}</p>
        </div>
      )}

      {digest.alerts?.length > 0 && (
        <div>
          <p className="text-xs text-slate-400 dark:text-slate-500">Alert Delivery</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {digest.alerts.map((alert) => (
              <span key={alert.channel} className={`text-xs ${DELIVERY_COLORS[alert.deliveryStatus]}`}>
                {alert.channel}: {DELIVERY_LABELS[alert.deliveryStatus]}
              </span>
            ))}
          </div>
        </div>
      )}

      {digest.jobId && (
        <Button as="a" href={getExportXlsxUrl(digest.jobId)} variant="secondary" size="sm">
          <Download size={14} /> Download Digest
        </Button>
      )}
    </Card>
  )
}
