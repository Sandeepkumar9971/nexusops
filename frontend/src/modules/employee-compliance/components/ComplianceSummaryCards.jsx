import { CheckCircle2, AlertCircle, HelpCircle, XCircle } from 'lucide-react'
import Card from '../../../components/common/Card'
import { VERIFICATION_STATUS } from '../constants'

function countByStatus(results, side) {
  return results.reduce(
    (acc, row) => {
      const status = row[side]?.status
      if (status && acc[status] !== undefined) acc[status] += 1
      return acc
    },
    {
      [VERIFICATION_STATUS.MATCHED]: 0,
      [VERIFICATION_STATUS.NAME_MISMATCH]: 0,
      [VERIFICATION_STATUS.AMOUNT_MISMATCH]: 0,
      [VERIFICATION_STATUS.MISSING]: 0,
      [VERIFICATION_STATUS.NEEDS_REVIEW]: 0,
    },
  )
}

function SideSummary({ title, counts }) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  const mismatchCount = counts[VERIFICATION_STATUS.NAME_MISMATCH] + counts[VERIFICATION_STATUS.AMOUNT_MISMATCH]

  const items = [
    { label: 'Matched', value: counts[VERIFICATION_STATUS.MATCHED], icon: CheckCircle2, color: 'text-green-600 dark:text-green-400' },
    { label: 'Mismatch', value: mismatchCount, icon: AlertCircle, color: 'text-orange-600 dark:text-orange-400' },
    { label: 'Missing', value: counts[VERIFICATION_STATUS.MISSING], icon: XCircle, color: 'text-slate-500 dark:text-slate-400' },
    { label: 'Needs Review', value: counts[VERIFICATION_STATUS.NEEDS_REVIEW], icon: HelpCircle, color: 'text-amber-600 dark:text-amber-400' },
  ]

  return (
    <Card padding="sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        <span className="text-xs text-slate-400 dark:text-slate-500">
          {total} employee{total === 1 ? '' : 's'}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="flex items-center gap-2">
            <Icon size={16} className={color} />
            <div>
              <p className="text-sm font-semibold text-slate-900 tabular-nums dark:text-slate-50">{value}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">{label}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

export default function ComplianceSummaryCards({ results }) {
  const pfCounts = countByStatus(results, 'pf')
  const esicCounts = countByStatus(results, 'esic')

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <SideSummary title="PF Verification" counts={pfCounts} />
      <SideSummary title="ESIC Verification" counts={esicCounts} />
    </div>
  )
}
