import { useEffect, useState } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import StatusBadge from '../../../components/common/StatusBadge'

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-1.5 dark:border-white/5">
      <dt className="text-slate-400 dark:text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-700 dark:text-slate-200">{value ?? '—'}</dd>
    </div>
  )
}

function formatAmount(amount) {
  return amount != null ? `₹${Number(amount).toFixed(2)}` : null
}

function VerificationSection({ title, data }) {
  if (!data) return null
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{title}</p>
        <StatusBadge status={data.status} />
      </div>
      <dl className="mt-2 space-y-2 text-sm">
        <Row label="Wagesheet Amount" value={formatAmount(data.wagesheetAmount)} />
        <Row label="ECR Amount" value={formatAmount(data.ecrAmount)} />
        <Row label="Difference" value={data.difference != null ? formatAmount(Math.abs(data.difference)) : null} />
        <Row label="ECR Name" value={data.ecrName} />
        <Row label="Name Similarity" value={data.nameSimilarity != null ? `${data.nameSimilarity.toFixed(1)}%` : null} />
        <Row label="Source Page" value={data.sourcePage} />
      </dl>
      {data.reason && (
        <p className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
          {data.reason}
        </p>
      )}
    </div>
  )
}

export default function EmployeeDetailDrawer({ result, onClose }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Mount closed, then flip open on the next frame so the transition runs.
    const frame = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  if (!result) return null
  const { employee, wagesheet, pf, esic, rowErrors } = result

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm transition-opacity dark:bg-navy-bg/60 ${visible ? 'opacity-100' : 'opacity-0'}`}
      onClick={onClose}
    >
      <div
        className={`h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-xl transition-transform duration-200 dark:border-l dark:border-white/10 dark:bg-[rgba(22,34,53,0.85)] dark:shadow-glass dark:backdrop-blur-xl ${
          visible ? 'translate-x-0' : 'translate-x-full'
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Employee Details</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-slate-200"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <p className="mt-4 truncate text-sm font-medium text-slate-700 dark:text-slate-200" title={employee.name}>
          {employee.name}
        </p>

        <dl className="mt-2 space-y-2 text-sm">
          <Row label="UAN" value={employee.uan} />
          <Row label="IP Number" value={employee.ipNumber} />
          <Row label="Agency" value={employee.agency} />
          <Row label="State" value={employee.state} />
          <Row label="Wagesheet PF Amount" value={formatAmount(wagesheet?.pfAmount)} />
          <Row label="Wagesheet ESIC Amount" value={formatAmount(wagesheet?.esicAmount)} />
        </dl>

        {rowErrors && rowErrors.length > 0 && (
          <div className="mt-4 space-y-1 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
            {rowErrors.map((err, idx) => (
              <p key={idx} className="flex items-start gap-1.5">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                {err}
              </p>
            ))}
          </div>
        )}

        <VerificationSection title="PF Verification" data={pf} />
        <VerificationSection title="ESIC Verification" data={esic} />
      </div>
    </div>
  )
}
