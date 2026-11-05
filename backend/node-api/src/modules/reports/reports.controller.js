import fs from 'fs'
import path from 'path'
import Report from '../../models/Report.js'
import { asyncHandler } from '../../middleware/asyncHandler.js'

export const listReports = asyncHandler(async (req, res) => {
  const { moduleId } = req.query
  const filter = moduleId ? { moduleId } : {}
  const reports = await Report.find(filter).sort({ createdAt: -1 })
  res.json({ reports })
})

export const downloadReport = asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id)
  if (!report || !fs.existsSync(report.filePath)) {
    res.status(404)
    throw new Error('Report file not found.')
  }
  res.download(report.filePath, path.basename(report.filePath))
})
