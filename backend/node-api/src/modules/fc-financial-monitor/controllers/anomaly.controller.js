import FinancialAnomaly, { ANOMALY_STATUS } from '../../../models/FinancialAnomaly.js'
import FinancialAuditLog from '../../../models/FinancialAuditLog.js'
import { asyncHandler } from '../../../middleware/asyncHandler.js'

const MODULE_ID = 'fc-financial-monitor'

export const listAnomalies = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo, fc, severity, metric, status } = req.query
  const filter = { moduleId: MODULE_ID }

  if (dateFrom || dateTo) {
    filter.date = {}
    if (dateFrom) filter.date.$gte = dateFrom
    if (dateTo) filter.date.$lte = dateTo
  }
  if (fc) filter.fcName = new RegExp(fc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
  if (severity) filter.severity = severity
  if (metric) filter.metric = metric
  if (status) filter.status = status

  const anomalies = await FinancialAnomaly.find(filter).sort({ date: -1, severity: -1 }).limit(500)
  res.json({ anomalies })
})

export const getAnomalyDetail = asyncHandler(async (req, res) => {
  const anomaly = await FinancialAnomaly.findById(req.params.id)
  if (!anomaly) {
    res.status(404)
    throw new Error('Anomaly not found.')
  }
  const auditTrail = await FinancialAuditLog.find({ anomalyId: anomaly._id }).sort({ timestamp: -1 })
  res.json({ anomaly, auditTrail })
})

const VALID_STATUSES = Object.values(ANOMALY_STATUS)

export const updateAnomalyStatus = asyncHandler(async (req, res) => {
  const { status, reason } = req.body
  if (!VALID_STATUSES.includes(status)) {
    res.status(400)
    throw new Error(`status must be one of: ${VALID_STATUSES.join(', ')}`)
  }
  if (status === ANOMALY_STATUS.IGNORED && !reason) {
    res.status(400)
    throw new Error('A reason is required when marking an anomaly as Ignored.')
  }

  const anomaly = await FinancialAnomaly.findById(req.params.id)
  if (!anomaly) {
    res.status(404)
    throw new Error('Anomaly not found.')
  }

  const previousStatus = anomaly.status
  anomaly.status = status
  anomaly.statusReason = reason || undefined
  await anomaly.save()

  // The original detected finding (metric/actualValue/explanation/etc.) is
  // never touched — only the review status changes, and every change is
  // permanently recorded here even if the anomaly's status changes again
  // later.
  await FinancialAuditLog.create({
    anomalyId: anomaly._id,
    userId: req.user.id,
    previousStatus,
    newStatus: status,
    reason: reason || undefined,
  })

  res.json({ anomaly })
})
