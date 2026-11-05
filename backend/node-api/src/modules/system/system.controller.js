import pythonAiClient from '../../services/pythonAiClient.js'
import { asyncHandler } from '../../middleware/asyncHandler.js'

export const getSystemHealth = asyncHandler(async (req, res) => {
  let pythonAi

  try {
    const { data } = await pythonAiClient.get('/health')
    pythonAi = { reachable: true, ...data }
  } catch (err) {
    pythonAi = { reachable: false, error: err.message }
  }

  res.json({
    node: { reachable: true },
    pythonAi,
  })
})
