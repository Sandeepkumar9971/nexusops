import axios from 'axios'

// Server-to-server client for the Python AI service. The browser never
// calls this directly — only Node does, as the orchestration layer.
const pythonAiClient = axios.create({
  baseURL: process.env.PYTHON_AI_BASE_URL || 'http://localhost:8000',
  timeout: 8000,
})

export default pythonAiClient
