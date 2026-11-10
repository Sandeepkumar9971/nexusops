import { useState } from 'react'
import { Check, Pencil } from 'lucide-react'
import Card from '../../../components/common/Card'
import Button from '../../../components/common/Button'
import { useToast } from '../../../app/providers/ToastProvider'

const INPUT_CLASS =
  'w-full rounded-lg border border-slate-200 px-2 py-1 text-sm dark:border-navy-border dark:bg-navy-surface2 dark:text-slate-100'

function ManagerRow({ manager, onSave }) {
  const { notify } = useToast()
  const [editing, setEditing] = useState(false)
  const [managerName, setManagerName] = useState(manager.managerName || '')
  const [managerEmail, setManagerEmail] = useState(manager.managerEmail || '')
  const [managerPhone, setManagerPhone] = useState(manager.managerPhone || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(manager.fcName, { managerName, managerEmail, managerPhone })
      setEditing(false)
      notify(`Manager contact saved for ${manager.fcName}.`, { variant: 'success', title: 'Saved' })
    } catch (err) {
      notify(err.response?.data?.error?.message || 'Failed to save manager contact.', { variant: 'error', title: 'Save failed' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <tr className="transition-colors hover:bg-slate-50/80 dark:hover:bg-white/[0.03]">
      <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">{manager.fcName}</td>
      <td className="px-4 py-3">
        {editing ? (
          <input value={managerName} onChange={(e) => setManagerName(e.target.value)} className={INPUT_CLASS} placeholder="Name" />
        ) : (
          manager.managerName || <span className="text-slate-400 dark:text-slate-500">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        {editing ? (
          <input value={managerEmail} onChange={(e) => setManagerEmail(e.target.value)} className={INPUT_CLASS} placeholder="email@example.com" />
        ) : (
          manager.managerEmail || <span className="text-slate-400 dark:text-slate-500">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        {editing ? (
          <input value={managerPhone} onChange={(e) => setManagerPhone(e.target.value)} className={INPUT_CLASS} placeholder="919999999999" />
        ) : (
          manager.managerPhone || <span className="text-slate-400 dark:text-slate-500">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        {manager.configured ? (
          <span className="text-xs text-green-600 dark:text-green-400">Configured</span>
        ) : (
          <span className="text-xs text-slate-400 dark:text-slate-500">Not configured — alerts use the global default</span>
        )}
      </td>
      <td className="px-4 py-3">
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

export default function FCManagerTable({ managers, onSave }) {
  if (managers.length === 0) {
    return (
      <Card>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No FCs found yet — process a financial batch first, then its FC(s) will appear here for manager contact configuration.
        </p>
      </Card>
    )
  }

  return (
    <Card padding="none" className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200/80 bg-slate-50/60 text-xs uppercase tracking-wide text-slate-400 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-500">
          <tr>
            <th className="px-4 py-3 font-semibold">FC</th>
            <th className="px-4 py-3 font-semibold">Manager Name</th>
            <th className="px-4 py-3 font-semibold">Manager Email</th>
            <th className="px-4 py-3 font-semibold">Manager Phone (WhatsApp)</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
          {managers.map((manager) => (
            <ManagerRow key={manager.fcName} manager={manager} onSave={onSave} />
          ))}
        </tbody>
      </table>
    </Card>
  )
}
