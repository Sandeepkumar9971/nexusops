import FCDailyFinancial from '../../../models/FCDailyFinancial.js'
import FinancialAnomaly from '../../../models/FinancialAnomaly.js'
import FinancialAlert from '../../../models/FinancialAlert.js'
import { asyncHandler } from '../../../middleware/asyncHandler.js'

const MODULE_ID = 'fc-financial-monitor'

// Finds the most recent date any FC reported, so the Daily Digest page has
// a sensible default to open on before the user picks a specific date.
async function getLatestAvailableDate() {
  const latest = await FCDailyFinancial.findOne({ moduleId: MODULE_ID }).sort({ date: -1 }).select('date')
  return latest?.date || null
}

export const listDigests = asyncHandler(async (req, res) => {
  let { date, fc } = req.query
  if (!date) {
    date = await getLatestAvailableDate()
  }
  if (!date) {
    res.json({ date: null, digests: [] })
    return
  }

  const filter = { moduleId: MODULE_ID, date }
  if (fc) filter.fcName = new RegExp(fc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')

  const records = await FCDailyFinancial.find(filter).sort({ fcName: 1 })
  const anomalies = await FinancialAnomaly.find({ moduleId: MODULE_ID, date, ...(fc ? { fcName: filter.fcName } : {}) })
  const alerts = await FinancialAlert.find({ date, ...(fc ? { fcName: filter.fcName } : {}) })

  const anomaliesByFc = {}
  anomalies.forEach((a) => {
    if (!anomaliesByFc[a.fcName]) anomaliesByFc[a.fcName] = []
    anomaliesByFc[a.fcName].push(a)
  })
  const alertsByFc = {}
  alerts.forEach((a) => {
    if (!alertsByFc[a.fcName]) alertsByFc[a.fcName] = []
    alertsByFc[a.fcName].push(a)
  })

  const digests = records.map((r) => ({
    fcId: r.fcId,
    fcName: r.fcName,
    date: r.date,
    jobId: r.jobId,
    revenue: r.revenue,
    cm1: r.cm1,
    cm1Percentage: r.cm1Percentage,
    cm2: r.cm2,
    cm2Percentage: r.cm2Percentage,
    overallStatus: r.overallStatus,
    flaggedCosts: r.flaggedCosts,
    insight: r.insight,
    anomalies: anomaliesByFc[r.fcName] || [],
    alerts: (alertsByFc[r.fcName] || []).map((a) => ({
      channel: a.channel,
      deliveryStatus: a.deliveryStatus,
      sentAt: a.sentAt,
      deliveryError: a.deliveryError,
    })),
  }))

  res.json({ date, digests })
})

export const listAvailableDates = asyncHandler(async (req, res) => {
  const dates = await FCDailyFinancial.distinct('date', { moduleId: MODULE_ID })
  res.json({ dates: dates.sort().reverse() })
})
