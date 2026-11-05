import FCDailyFinancial from '../../../models/FCDailyFinancial.js'
import FinancialAnomaly, { ANOMALY_STATUS } from '../../../models/FinancialAnomaly.js'
import FinancialTarget from '../../../models/FinancialTarget.js'
import { asyncHandler } from '../../../middleware/asyncHandler.js'
import { METRIC_LABELS, mergeTargets } from '../financialTargetDefaults.js'

const MODULE_ID = 'fc-financial-monitor'
const SEVERITY_RANK = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, INFO: 0 }

function buildDateMatch(dateFrom, dateTo) {
  const match = {}
  if (dateFrom || dateTo) {
    match.date = {}
    if (dateFrom) match.date.$gte = dateFrom
    if (dateTo) match.date.$lte = dateTo
  }
  return match
}

export const listFCs = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo, fc, status, anomalyCategory } = req.query

  const match = { moduleId: MODULE_ID, ...buildDateMatch(dateFrom, dateTo) }
  let latest = await FCDailyFinancial.aggregate([
    { $match: match },
    { $sort: { date: -1, createdAt: -1 } },
    {
      $group: {
        _id: '$fcName',
        fcId: { $first: '$fcId' },
        fcName: { $first: '$fcName' },
        date: { $first: '$date' },
        revenue: { $first: '$revenue' },
        cm1: { $first: '$cm1' },
        cm1Percentage: { $first: '$cm1Percentage' },
        cm2: { $first: '$cm2' },
        cm2Percentage: { $first: '$cm2Percentage' },
        overallStatus: { $first: '$overallStatus' },
      },
    },
  ])

  if (fc) {
    const needle = fc.toLowerCase()
    latest = latest.filter((row) => row.fcName.toLowerCase().includes(needle))
  }
  if (status) {
    latest = latest.filter((row) => row.overallStatus === status)
  }

  const anomalyMatch = { moduleId: MODULE_ID, ...buildDateMatch(dateFrom, dateTo) }
  if (anomalyCategory) anomalyMatch.metric = anomalyCategory
  const anomalies = await FinancialAnomaly.find(anomalyMatch).sort({ date: -1 })

  if (anomalyCategory) {
    const fcNamesWithCategory = new Set(anomalies.map((a) => a.fcName))
    latest = latest.filter((row) => fcNamesWithCategory.has(row.fcName))
  }

  const anomaliesByFc = {}
  anomalies.forEach((a) => {
    if (!anomaliesByFc[a.fcName]) anomaliesByFc[a.fcName] = []
    anomaliesByFc[a.fcName].push(a)
  })

  const fcs = latest.map((row) => {
    const fcAnomalies = anomaliesByFc[row.fcName] || []
    const openAnomalies = fcAnomalies.filter((a) => a.status === ANOMALY_STATUS.OPEN || a.status === ANOMALY_STATUS.UNDER_REVIEW)
    const mainIssue = [...openAnomalies].sort((a, b) => (SEVERITY_RANK[b.severity] || 0) - (SEVERITY_RANK[a.severity] || 0))[0]

    return {
      fcId: row.fcId,
      fcName: row.fcName,
      latestDate: row.date,
      revenue: row.revenue,
      cm1Percentage: row.cm1Percentage,
      cm2Percentage: row.cm2Percentage,
      overallStatus: row.overallStatus,
      anomalyCount: openAnomalies.length,
      mainIssue: mainIssue ? mainIssue.metric : null,
    }
  })

  res.json({ fcs })
})

export const getFCDetail = asyncHandler(async (req, res) => {
  const { fcName } = req.params
  const { dateFrom, dateTo } = req.query

  const match = { moduleId: MODULE_ID, fcName, ...buildDateMatch(dateFrom, dateTo) }
  const records = await FCDailyFinancial.find(match).sort({ date: 1 })

  if (records.length === 0) {
    res.status(404)
    throw new Error('No financial records found for this FC.')
  }

  const latest = records[records.length - 1]

  const configuredTargets = await FinancialTarget.find({})
  const targets = mergeTargets(configuredTargets)

  const costCategories = ['manpower_cost', 'packaging_cost', 'power_and_fuel', 'fc_rent', 'equipment_rentals', 'overheads']
  const costBreakdown = costCategories.map((key) => {
    const amount = latest.costAmounts?.[key] ?? null
    const percentage = latest.costPercentages?.[key] ?? null
    const target = targets[key]
    let differenceFromTarget = null
    let targetStatus = 'UNCONFIGURED'
    if (target.minimum != null && percentage != null) {
      if (percentage > target.maximum) {
        differenceFromTarget = Math.round((percentage - target.maximum) * 100) / 100
        targetStatus = 'ABOVE_TARGET'
      } else if (percentage < target.minimum) {
        differenceFromTarget = Math.round((percentage - target.minimum) * 100) / 100
        targetStatus = 'BELOW_TARGET'
      } else {
        differenceFromTarget = 0
        targetStatus = 'WITHIN_TARGET'
      }
    }
    return { key, label: METRIC_LABELS[key], amount, percentage, target, differenceFromTarget, targetStatus }
  })

  const trends = records.map((r) => ({
    date: r.date,
    revenue: r.revenue,
    cm1Percentage: r.cm1Percentage,
    cm2Percentage: r.cm2Percentage,
    costPercentages: r.costPercentages,
    overallStatus: r.overallStatus,
  }))

  const anomalyCounts = await FinancialAnomaly.aggregate([
    { $match: { moduleId: MODULE_ID, fcName, ...buildDateMatch(dateFrom, dateTo) } },
    { $group: { _id: '$date', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ])

  res.json({
    fcName,
    fcId: latest.fcId,
    summary: {
      latestDate: latest.date,
      revenue: latest.revenue,
      totalCosts: Math.round((latest.revenue - latest.cm2) * 100) / 100,
      cm1: latest.cm1,
      cm1Percentage: latest.cm1Percentage,
      cm2: latest.cm2,
      cm2Percentage: latest.cm2Percentage,
      overallStatus: latest.overallStatus,
    },
    costBreakdown,
    trends,
    anomalyCounts: anomalyCounts.map((a) => ({ date: a._id, count: a.count })),
  })
})
