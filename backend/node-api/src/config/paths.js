import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// src/config -> src -> node-api -> backend -> ai-hub (project root)
export const PROJECT_ROOT = path.resolve(__dirname, '../../../../')
export const UPLOAD_ROOT = path.join(PROJECT_ROOT, 'uploads')
