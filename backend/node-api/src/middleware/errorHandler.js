export function notFoundHandler(req, res) {
  res.status(404).json({ success: false, error: { message: `Route ${req.originalUrl} not found` } })
}

// Consistent error shape across every module's routes.
export function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  console.error(err)
  const baseStatus = res.statusCode && res.statusCode !== 200 ? res.statusCode : err.statusCode || 500
  const status = err.name === 'MulterError' ? 400 : baseStatus
  res.status(status).json({
    success: false,
    error: { message: err.message || 'Internal Server Error' },
  })
}
