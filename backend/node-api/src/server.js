import 'dotenv/config'
import http from 'http'
import app from './app.js'
import { connectDB } from './config/db.js'
import { initRealtime } from './services/realtimeService.js'
import { startStaleJobSweeper } from './services/jobSweeperService.js'

const PORT = process.env.PORT || 4000

async function start() {
  await connectDB()
  // Socket.IO needs the raw http.Server (not just the Express app) so it
  // can upgrade the same port's connections to websockets.
  const httpServer = http.createServer(app)
  initRealtime(httpServer)
  startStaleJobSweeper()
  httpServer.listen(PORT, () => {
    console.log(`Node API listening on port ${PORT}`)
  })
}

start().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
