import { useEffect, useState } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import StatusBadge from '../../../components/common/StatusBadge'
import Button from '../../../components/common/Button'
import { getAnomalyDetail, updateAnomalyStatus } from '../services/fcFinancialApi'
import { useToast } from '../../../app/providers/ToastProvider'
import { ANOMALY_STATUS_OPTIONS } from '../constants'

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-1.5 dark:border-white/5">
      <dt className="text-slate-400 dark:text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-700 tabular-nums dark:text-slate-200">{value ?? '—'}</dd>
    </div>
  )
}

export default function AnomalyDetailDrawer({ anomalyId, onClose, onUpdated }) {
  const { notify } = useToast()
  const [visible, setVisible] = useState(false)
  const [detail, setDetail] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [newStatus, setNewStatus] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    let cancelled = false
    getAnomalyDetail(anomalyId)
      .then((data) => {
        if (!cancelled) {
          setDetail(data)
          setNewStatus(data.anomaly.status)
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not load anomaly details.')
      })
    return () => {
      cancelled = true
    }
  }, [anomalyId])

  const handleSave = async () => {
    setSaveError(null)
    if (newStatus === 'IGNORED' && !reason.trim()) {
      setSaveError('A reason is required when marking an anomaly as Ignored.')
      return
    }
    setSaving(true)
    try {
      const updated = await updateAnomalyStatus(anomalyId, { status: newStatus, reason: reason.trim() || undefined })
      setDetail((prev) => ({ ...prev, anomaly: updated }))
      onUpdated?.(updated)
      notify(`${updated.fcName} — ${updated.metric} marked ${updated.status.replace('_', ' ').toLowerCase()}.`, {
        variant: 'success',
        title: 'Status updated',
      })
    } catch (err) {
      const message = err.response?.data?.error?.message || 'Failed to update status.'
      setSaveError(message)
      notify(message, { variant: 'error', title: 'Update failed' })
    } finally {
      setSaving(false)
    }
  }

  if (!anomalyId) return null

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
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Anomaly Details</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-slate-200"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {loadError && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{loadError}</p>}

        {detail && (
          <>
            <div className="mt-4 flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                {detail.anomaly.fcName} — {detail.anomaly.metric}
              </p>
              <StatusBadge status={detail.anomaly.severity} />
            </div>

            <dl className="mt-3 space-y-2 text-sm">
              <Row label="Date" value={detail.anomaly.date} />
              <Row label="Actual Value" value={detail.anomaly.actualValue != null ? `${detail.anomaly.actualValue}%` : null} />
              <Row
                label="Target Range"
                value={
                  detail.anomaly.targetRange?.minimum != null
                    ? `${detail.anomaly.targetRange.minimum}% – ${detail.anomaly.targetRange.maximum}%`
                    : 'Not configured'
                }
              />
              <Row label="Deviation" value={detail.anomaly.deviation != null ? `${detail.anomaly.deviation}pp` : null} />
              <Row
                label="Financial Impact"
                value={detail.anomaly.financialImpact != null ? `₹${detail.anomaly.financialImpact.toLocaleString()}` : null}
              />
              {detail.anomaly.recurringStreak != null && (
                <Row
                  label="Recurring"
                  value={
                    detail.anomaly.recurringStreak >= 2
                      ? `${detail.anomaly.recurringStreak} consecutive days`
                      : 'First occurrence'
                  }
                />
              )}
            </dl>

            <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
              {detail.anomaly.explanation}
            </p>
            <p className="mt-2 rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-xs text-indigo-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
              <strong>Recommendation: </strong>
              {detail.anomaly.recommendation}
            </p>

            <div className="mt-5 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Update Status</p>
              <select
                value={newStatus}
                onChange={(event) => setNewStatus(event.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm transition-colors focus:border-indigo-400 focus:outline-none dark:border-navy-border dark:bg-navy-surface2 dark:text-slate-100 dark:focus:border-blue-400/50"
              >
                {ANOMALY_STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s.replace('_', ' ')}
                  </option>
                ))}
              </select>
              {newStatus === 'IGNORED' && (
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Reason for ignoring (required)"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm transition-colors focus:border-indigo-400 focus:outline-none dark:border-navy-border dark:bg-navy-surface2 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-400/50"
                  rows={2}
                />
              )}
              {saveError && (
                <p className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
                  <AlertTriangle size={12} className="shrink-0" />
                  {saveError}
                </p>
              )}
              <Button onClick={handleSave} loading={saving} size="sm">
                Save Status
              </Button>
            </div>

            {detail.auditTrail.length > 0 && (
              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Audit Trail</p>
                <ul className="mt-2 space-y-2">
                  {detail.auditTrail.map((entry) => (
                    <li key={entry._id} className="rounded-lg border border-slate-100 p-2 text-xs text-slate-600 dark:border-white/10 dark:text-slate-400">
                      <p>
                        <span className="font-medium text-slate-800 dark:text-slate-200">{entry.previousStatus || '—'}</span> →{' '}
                        <span className="font-medium text-slate-800 dark:text-slate-200">{entry.newStatus}</span>
                      </p>
                      {entry.reason && <p className="mt-1 text-slate-500 dark:text-slate-400">{entry.reason}</p>}
                      <p className="mt-1 text-slate-400 dark:text-slate-500">{new Date(entry.timestamp).toLocaleString()}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
