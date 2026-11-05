import FCDailyFinancial from '../../../models/FCDailyFinancial.js'
import FinancialAnomaly, { ANOMALY_STATUS } from '../../../models/FinancialAnomaly.js'
import Job from '../../../models/Job.js'
import { asyncHandler } from '../../../middleware/asyncHandler.js'

const MODULE_ID = 'fc-financial-monitor'

// The Overview-style KPIs are a snapshot of each FC's most recent reported
// day (not a lifetime total) — that's what "Total FCs currently at Red"
// actually means operationally. $sort + $group's $first gives us exactly
// that "latest record per FC" set in one aggregation.
async function getLatestPerFC() {
  return FCDailyFinancial.aggregate([
    { $match: { moduleId: MODULE_ID } },
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
        flaggedCosts: { $first: '$flaggedCosts' },
        insight: { $first: '$insight' },
      },
    },
  ])
}

export const getDashboardSummary = asyncHandler(async (req, res) => {
  const latest = await getLatestPerFC()

  const totalFCs = latest.length
  const totalRevenue = latest.reduce((sum, fc) => sum + (fc.revenue || 0), 0)
  const cm1Values = latest.map((fc) => fc.cm1Percentage).filter((v) => v != null)
  const cm2Values = latest.map((fc) => fc.cm2Percentage).filter((v) => v != null)
  const averageCm1Percentage = cm1Values.length ? cm1Values.reduce((a, b) => a + b, 0) / cm1Values.length : null
  const averageCm2Percentage = cm2Values.length ? cm2Values.reduce((a, b) => a + b, 0) / cm2Values.length : null

  const statusCounts = { RED: 0, YELLOW: 0, GREEN: 0, BLUE: 0, UNKNOWN: 0 }
  latest.forEach((fc) => {
    const status = fc.overallStatus || 'UNKNOWN'
    statusCounts[status] = (statusCounts[status] || 0) + 1
  })

  const totalBatches = await Job.countDocuments({ moduleId: MODULE_ID })
  const openAnomalies = await FinancialAnomaly.countDocuments({
    moduleId: MODULE_ID,
    status: { $in: [ANOMALY_STATUS.OPEN, ANOMALY_STATUS.UNDER_REVIEW] },
  })

  res.json({
    totalBatches,
    totalFCs,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    averageCm1Percentage: averageCm1Percentage != null ? Math.round(averageCm1Percentage * 100) / 100 : null,
    averageCm2Percentage: averageCm2Percentage != null ? Math.round(averageCm2Percentage * 100) / 100 : null,
    redFCs: statusCounts.RED,
    yellowFCs: statusCounts.YELLOW,
    greenFCs: statusCounts.GREEN,
    blueFCs: statusCounts.BLUE,
    openAnomalies,
  })
})
