import { asyncHandler } from '../../middleware/asyncHandler.js'
import { getDashboardSummary } from './dashboard.service.js'

export const getSummary = asyncHandler(async (req, res) => {
  const summary = await getDashboardSummary()
  res.json(summary)
})
