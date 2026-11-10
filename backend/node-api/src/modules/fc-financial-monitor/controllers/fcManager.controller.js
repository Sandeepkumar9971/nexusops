import FCManager from '../../../models/FCManager.js'
import FCDailyFinancial from '../../../models/FCDailyFinancial.js'
import { asyncHandler } from '../../../middleware/asyncHandler.js'

// Lists every FC seen in processed data (not just ones with a manager
// already configured) joined with whatever manager contact exists, so the
// Target Configuration-style UI can show "not configured yet" for an FC
// rather than only ever showing FCs someone already set up.
export const listFCManagers = asyncHandler(async (req, res) => {
  const [fcNames, managers] = await Promise.all([FCDailyFinancial.distinct('fcName'), FCManager.find({})])
  const byName = Object.fromEntries(managers.map((m) => [m.fcName, m]))

  const merged = fcNames
    .filter(Boolean)
    .sort()
    .map((fcName) => {
      const existing = byName[fcName]
      return {
        fcName,
        managerName: existing?.managerName || null,
        managerEmail: existing?.managerEmail || null,
        managerPhone: existing?.managerPhone || null,
        slackWebhookUrl: existing?.slackWebhookUrl || null,
        configured: Boolean(existing?.managerEmail || existing?.managerPhone || existing?.slackWebhookUrl),
      }
    })

  res.json({ managers: merged })
})

export const upsertFCManager = asyncHandler(async (req, res) => {
  const { fcName } = req.params
  const { managerName, managerEmail, managerPhone, slackWebhookUrl } = req.body

  const manager = await FCManager.findOneAndUpdate(
    { fcName },
    { fcName, managerName, managerEmail, managerPhone, slackWebhookUrl },
    { upsert: true, new: true },
  )

  res.json({ manager })
})
