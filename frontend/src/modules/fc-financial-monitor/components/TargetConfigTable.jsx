import { useState } from 'react'
import { AlertTriangle, Check, Pencil } from 'lucide-react'
import Card from '../../../components/common/Card'
import Button from '../../../components/common/Button'
import { useToast } from '../../../app/providers/ToastProvider'
import { METRIC_LABELS } from '../constants'

const SOURCE_LABELS = {
  specification: 'From business rules',
  'reference-file': 'From Ideal FC Criteria reference file',
  'default-estimate': 'Example default — not from an inspected source file',
  configured: 'Manually configured',
  unconfigured: 'Not configured',
}

const NUMBER_INPUT_CLASS =
  'w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm dark:border-navy-border dark:bg-navy-surface2 dark:text-slate-100'

function TargetRow({ target, onSave }) {
  const { notify } = useToast()
  const [editing, setEditing] = useState(false)
  const [minimum, setMinimum] = useState(target.minimum ?? '')
  const [maximum, setMaximum] = useState(target.maximum ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleSave = async () => {
    setError(null)
    const min = Number(minimum)
    const max = Number(maximum)
    if (Number.isNaN(min) || Number.isNaN(max) || min > max) {
      setError('Enter valid numbers, with minimum ≤ maximum.')
      return
    }
    setSaving(true)
    try {
      await onSave(target.metric, { minimum: min, maximum: max })
      setEditing(false)
      notify(`${METRIC_LABELS[target.metric] || target.metric} target set to ${min}%–${max}%.`, {
        variant: 'success',
        title: 'Target saved',
      })
    } catch (err) {
      const message = err.response?.data?.error?.message || 'Failed to save target.'
      setError(message)
      notify(message, { variant: 'error', title: 'Save failed' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <tr className="transition-colors hover:bg-slate-50/80 dark:hover:bg-white/[0.03]">
      <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">{METRIC_LABELS[target.metric] || target.metric}</td>
      <td className="px-4 py-3">
        {editing ? (
          <input type="number" value={minimum} onChange={(event) => setMinimum(event.target.value)} className={NUMBER_INPUT_CLASS} />
        ) : target.minimum != null ? (
          <span className="tabular-nums text-slate-700 dark:text-slate-300">{target.minimum}%</span>
        ) : (
          <span className="text-slate-400 dark:text-slate-500">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        {editing ? (
          <input type="number" value={maximum} onChange={(event) => setMaximum(event.target.value)} className={NUMBER_INPUT_CLASS} />
        ) : target.maximum != null ? (
          <span className="tabular-nums text-slate-700 dark:text-slate-300">{target.maximum}%</span>
        ) : (
          <span className="text-slate-400 dark:text-slate-500">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{SOURCE_LABELS[target.source] || target.source}</td>
      <td className="px-4 py-3">
        {error && (
          <p className="mb-1 flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
            <AlertTriangle size={11} /> {error}
          </p>
        )}
        {editing ? (
          <Button size="sm" onClick={handleSave} loading={saving}>
            <Check size={12} /> Save
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            <Pencil size={12} /> Edit
          </Button>
        )}
      </td>
    </tr>
  )
}

export default function TargetConfigTable({ targets, onSave }) {
  return (
    <Card padding="none" className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200/80 bg-slate-50/60 text-xs uppercase tracking-wide text-slate-400 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-500">
          <tr>
            <th className="px-4 py-3 font-semibold">Metric</th>
            <th className="px-4 py-3 font-semibold">Minimum</th>
            <th className="px-4 py-3 font-semibold">Maximum</th>
            <th className="px-4 py-3 font-semibold">Source</th>
            <th className="px-4 py-3 font-semibold" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
          {targets.map((target) => (
            <TargetRow key={target.metric} target={target} onSave={onSave} />
          ))}
        </tbody>
      </table>
    </Card>
  )
}
