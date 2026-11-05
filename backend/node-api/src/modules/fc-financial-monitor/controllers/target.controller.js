import FinancialTarget from '../../../models/FinancialTarget.js'
import { asyncHandler } from '../../../middleware/asyncHandler.js'
import { ALL_METRICS, mergeTargets } from '../financialTargetDefaults.js'

export const listTargets = asyncHandler(async (req, res) => {
  const configuredDocs = await FinancialTarget.find({})
  const merged = mergeTargets(configuredDocs)
  res.json({ targets: ALL_METRICS.map((metric) => merged[metric]) })
})

export const upsertTarget = asyncHandler(async (req, res) => {
  const { metric } = req.params
  const { minimum, maximum } = req.body

  if (!ALL_METRICS.includes(metric)) {
    res.status(400)
    throw new Error(`Unknown metric: ${metric}`)
  }
  if (typeof minimum !== 'number' || typeof maximum !== 'number' || minimum > maximum) {
    res.status(400)
    throw new Error('minimum and maximum must be numbers, with minimum <= maximum.')
  }

  const target = await FinancialTarget.findOneAndUpdate(
    { metric },
    { metric, minimum, maximum, source: 'configured', effectiveDate: new Date() },
    { upsert: true, new: true },
  )

  res.json({ target })
})
