import FinancialAlert from '../../../models/FinancialAlert.js'
import { asyncHandler } from '../../../middleware/asyncHandler.js'

// Notification history — the in-app fallback the spec requires when
// external delivery (email/Slack/WhatsApp) isn't configured. Every alert
// this module ever generated is here regardless of channel or delivery
// outcome, so nothing is ever silently hidden.
export const listAlerts = asyncHandler(async (req, res) => {
  const { fc, channel, deliveryStatus } = req.query
  const filter = {}
  if (fc) filter.fcName = new RegExp(fc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
  if (channel) filter.channel = channel
  if (deliveryStatus) filter.deliveryStatus = deliveryStatus

  const alerts = await FinancialAlert.find(filter).sort({ createdAt: -1 }).limit(200)
  res.json({ alerts })
})
