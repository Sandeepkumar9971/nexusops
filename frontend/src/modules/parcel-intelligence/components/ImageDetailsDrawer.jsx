import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import StatusBadge from '../../../components/common/StatusBadge'
import apiClient from '../../../services/apiClient'
import { getToken } from '../../../services/authStorage'

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-1.5 dark:border-white/5">
      <dt className="text-slate-400 dark:text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-700 dark:text-slate-200">{value ?? '—'}</dd>
    </div>
  )
}

const EXTRACTION_METHOD_LABELS = {
  gemini: 'Gemini',
  tesseract: 'Tesseract OCR',
  ocr_unavailable: 'OCR Unavailable (Tesseract not installed)',
}

export default function ImageDetailsDrawer({ result, jobId, onClose }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Mount closed, then flip open on the next frame so the transition runs.
    const frame = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  if (!result) return null

  // Plain <img> tags can't send an Authorization header, so this route
  // accepts the token as a query param too (see requireAuth.js).
  const imageUrl = `${apiClient.defaults.baseURL}/parcel-intelligence/jobs/${jobId}/images/${result.filename}?token=${getToken()}`
  const fields = result.fields || {}

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
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Image Details</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-slate-200"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mt-4 flex items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[0.03]">
          <img src={imageUrl} alt={result.filename} className="max-h-72 w-full object-contain" />
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200" title={result.filename}>
            {result.filename}
          </p>
          <StatusBadge status={result.status} />
        </div>

        <dl className="mt-4 space-y-2 text-sm">
          <Row label="AWB" value={fields.awb} />
          <Row label="Location" value={fields.location} />
          <Row label="Weight" value={fields.weight != null ? `${fields.weight} kg` : null} />
          <Row
            label="Dimensions"
            value={fields.length != null ? `${fields.length} × ${fields.width} × ${fields.height} cm` : null}
          />
          <Row label="Volume" value={fields.volume != null ? `${fields.volume} cm³` : null} />
          <Row label="Timestamp" value={fields.timestamp} />
          <Row label="Sorter ID" value={fields.sorterId} />
          <Row label="Extraction Method" value={EXTRACTION_METHOD_LABELS[result.extractionMethod] ?? result.extractionMethod} />
          {result.extractionMethod === 'tesseract' && (
            <Row label="OCR Confidence" value={result.ocrConfidence != null ? `${result.ocrConfidence}%` : null} />
          )}
        </dl>

        {result.errorReason && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
            {result.errorReason}
          </div>
        )}

        {result.rawOcrText && (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Raw OCR Output</p>
            <pre className="mt-1 max-h-40 overflow-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-600 dark:bg-white/[0.03] dark:text-slate-400">
              {result.rawOcrText}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
