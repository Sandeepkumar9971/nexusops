// Guards service-to-service routes the Python AI service calls directly
// (never a browser) — a shared secret instead of a user JWT, since there
// is no logged-in user on this side of the call. Not configuring
// INTERNAL_API_TOKEN disables the route entirely (fails closed) rather
// than silently accepting unauthenticated internal calls.
export function requireInternalToken(req, res, next) {
  const expected = process.env.INTERNAL_API_TOKEN
  if (!expected) {
    res.status(503).json({ success: false, error: { message: 'INTERNAL_API_TOKEN is not configured.' } })
    return
  }
  const provided = req.headers['x-internal-token']
  if (provided !== expected) {
    res.status(401).json({ success: false, error: { message: 'Invalid internal token.' } })
    return
  }
  next()
}
