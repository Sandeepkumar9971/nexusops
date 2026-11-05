import fs from 'fs'
import path from 'path'
import multer from 'multer'
import { UPLOAD_ROOT } from '../config/paths.js'

// Shared upload service — any module that needs file uploads (parcel
// images today; wagesheets/PDFs for Compliance later) calls this with its
// own subfolder, accepted types, and limits, instead of configuring Multer
// itself. Files land at uploads/<subfolder>/<req.uploadBatchId>/<filename>.
export function createUploadMiddleware({ subfolder, allowedMimeTypes, maxFileSizeBytes, fieldName, maxFiles }) {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(UPLOAD_ROOT, subfolder, req.uploadBatchId)
      fs.mkdirSync(dir, { recursive: true })
      cb(null, dir)
    },
    filename: (req, file, cb) => {
      cb(null, file.originalname)
    },
  })

  const fileFilter = (req, file, cb) => {
    if (allowedMimeTypes && !allowedMimeTypes.includes(file.mimetype)) {
      const err = new Error(`Unsupported file type: ${file.mimetype}`)
      err.statusCode = 400
      cb(err)
      return
    }
    cb(null, true)
  }

  return multer({
    storage,
    fileFilter,
    limits: { fileSize: maxFileSizeBytes, files: maxFiles },
  }).array(fieldName, maxFiles)
}

// Clients disagree on the Content-Type they send for Office documents —
// curl's `-F field=@file.xlsx` defaults to this, and some browser/OS
// combinations misreport Office files the same way. When a field's
// declared mimetype is one of these generic values, fall back to
// trusting the file extension instead of rejecting a legitimate upload.
const GENERIC_MIME_TYPES = new Set(['application/octet-stream', ''])

// Variant for modules that need several DISTINCT file inputs in one
// request (e.g. Employee Compliance's wagesheet + PF ECR + ESIC ECR),
// each with its own field name, accepted types, and size limit — where
// createUploadMiddleware above assumes N copies of the same kind of file.
// fields: [{ name, allowedMimeTypes, allowedExtensions, maxFileSizeBytes, required }]
export function createMultiFieldUploadMiddleware({ subfolder, fields }) {
  const fieldConfigByName = Object.fromEntries(fields.map((f) => [f.name, f]))
  const maxFileSizeBytes = Math.max(...fields.map((f) => f.maxFileSizeBytes))

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(UPLOAD_ROOT, subfolder, req.uploadBatchId)
      fs.mkdirSync(dir, { recursive: true })
      cb(null, dir)
    },
    filename: (req, file, cb) => {
      cb(null, file.originalname)
    },
  })

  const fileFilter = (req, file, cb) => {
    const config = fieldConfigByName[file.fieldname]
    if (!config) {
      const err = new Error(`Unexpected field: ${file.fieldname}`)
      err.statusCode = 400
      cb(err)
      return
    }

    const mimetypeAllowed = !config.allowedMimeTypes || config.allowedMimeTypes.includes(file.mimetype)
    if (mimetypeAllowed) {
      cb(null, true)
      return
    }

    const extensionAllowed =
      config.allowedExtensions &&
      GENERIC_MIME_TYPES.has(file.mimetype) &&
      config.allowedExtensions.some((ext) => file.originalname.toLowerCase().endsWith(ext))
    if (extensionAllowed) {
      cb(null, true)
      return
    }

    const err = new Error(`Unsupported file type for ${file.fieldname}: ${file.mimetype}`)
    err.statusCode = 400
    cb(err)
  }

  const upload = multer({ storage, fileFilter, limits: { fileSize: maxFileSizeBytes } }).fields(
    fields.map((f) => ({ name: f.name, maxCount: 1 })),
  )

  // Wraps multer so a missing required field surfaces as the same
  // consistent 400 error shape as every other validation failure here,
  // instead of silently proceeding with req.files[name] undefined.
  return (req, res, next) => {
    upload(req, res, (err) => {
      if (err) return next(err)
      const missing = fields.filter((f) => f.required !== false && !req.files?.[f.name]?.[0])
      if (missing.length > 0) {
        const err2 = new Error(`Missing required file(s): ${missing.map((f) => f.name).join(', ')}`)
        err2.statusCode = 400
        return next(err2)
      }
      next()
    })
  }
}
