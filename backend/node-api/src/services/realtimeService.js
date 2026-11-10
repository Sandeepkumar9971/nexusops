import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'

let io = null

// Every socket joins a room named after its user id, so a notification for
// user X only ever reaches user X's own connected tabs/devices — never a
// broadcast to everyone.
function userRoom(userId) {
  return `user:${userId}`
}

export function initRealtime(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: (process.env.CORS_ORIGIN || '').split(',').map((o) => o.trim()).filter(Boolean),
      credentials: true,
    },
  })

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token
    if (!token) return next(new Error('Authentication required.'))
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET)
      socket.userId = payload.sub
      next()
    } catch {
      next(new Error('Invalid or expired session.'))
    }
  })

  io.on('connection', (socket) => {
    socket.join(userRoom(socket.userId))
  })

  return io
}

// Safe to call even if a notification was created from a context where
// sockets aren't relevant (tests, scripts) — it just silently no-ops
// instead of requiring every caller to check whether realtime is live.
export function emitToUser(userId, event, payload) {
  if (!io || !userId) return
  io.to(userRoom(userId.toString())).emit(event, payload)
}
