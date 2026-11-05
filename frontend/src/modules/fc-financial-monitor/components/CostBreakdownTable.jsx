import Card from '../../../components/common/Card'

const STATUS_STYLES = {
  WITHIN_TARGET: 'text-green-600 dark:text-green-400',
  ABOVE_TARGET: 'text-red-600 dark:text-red-400',
  BELOW_TARGET: 'text-amber-600 dark:text-amber-400',
  UNCONFIGURED: 'text-slate-400 dark:text-slate-500',
}

const STATUS_LABELS = {
  WITHIN_TARGET: 'Within Target',
  ABOVE_TARGET: 'Above Target',
  BELOW_TARGET: 'Below Target',
  UNCONFIGURED: 'Not Configured',
}

export default function CostBreakdownTable({ costBreakdown }) {
  return (
    <Card padding="none" className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200/80 bg-slate-50/60 text-xs uppercase tracking-wide text-slate-400 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-500">
          <tr>
            <th className="px-4 py-3 font-semibold">Cost Category</th>
            <th className="px-4 py-3 font-semibold">Amount</th>
            <th className="px-4 py-3 font-semibold">% of Revenue</th>
            <th className="px-4 py-3 font-semibold">Target Range</th>
            <th className="px-4 py-3 font-semibold">Difference</th>
            <th className="px-4 py-3 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
          {costBreakdown.map((row) => (
            <tr key={row.key} className="transition-colors hover:bg-slate-50/80 dark:hover:bg-white/[0.03]">
              <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">{row.label}</td>
              <td className="px-4 py-3 text-slate-700 tabular-nums dark:text-slate-300">₹{row.amount?.toLocaleString() ?? '—'}</td>
              <td className="px-4 py-3 text-slate-700 tabular-nums dark:text-slate-300">{row.percentage != null ? `${row.percentage}%` : '—'}</td>
              <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                {row.target.minimum != null ? `${row.target.minimum}% – ${row.target.maximum}%` : 'Not configured'}
              </td>
              <td className="px-4 py-3 text-slate-700 tabular-nums dark:text-slate-300">
                {row.differenceFromTarget != null ? `${row.differenceFromTarget > 0 ? '+' : ''}${row.differenceFromTarget}pp` : '—'}
              </td>
              <td className={`px-4 py-3 font-medium ${STATUS_STYLES[row.targetStatus]}`}>{STATUS_LABELS[row.targetStatus]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}
