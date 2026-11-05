import axios from 'axios'
import { getToken, clearToken } from './authStorage'

// Shared axios instance every module's service layer imports.
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api',
  timeout: 8000,
})

apiClient.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// A 401 means the session is gone (expired/invalid) — clear it and let
// AuthProvider's listener redirect to /login, instead of every caller
// having to check for this individually.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearToken()
      window.dispatchEvent(new Event('auth:unauthorized'))
    }
    return Promise.reject(error)
  },
)

export default apiClient
