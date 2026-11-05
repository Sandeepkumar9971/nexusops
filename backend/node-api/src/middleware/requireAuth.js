import jwt from 'jsonwebtoken'
import User from '../models/User.js'

function extractToken(req) {
  const header = req.headers.authorization
  if (header && header.startsWith('Bearer ')) return header.slice('Bearer '.length)
  // Plain <img>/<a> navigation (image previews, CSV/report downloads) can't
  // send an Authorization header — these specific routes accept the same
  // JWT as a query param instead. Still verified the same way, just a
  // different transport for the handful of endpoints the browser loads
  // directly rather than via axios.
  if (req.query.token) return req.query.token
  return null
}

// Protects a route: verifies the JWT, loads the user, and attaches it as
// req.user. Any route mounted behind this never runs its handler without a
// valid, current session.
export async function requireAuth(req, res, next) {
  const token = extractToken(req)
  if (!token) {
    res.status(401).json({ success: false, error: { message: 'Authentication required.' } })
    return
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(payload.sub)
    if (!user) {
      res.status(401).json({ success: false, error: { message: 'Invalid session.' } })
      return
    }
    req.user = { id: user._id.toString(), email: user.email, name: user.name, role: user.role }
    next()
  } catch {
    res.status(401).json({ success: false, error: { message: 'Invalid or expired session.' } })
  }
}
