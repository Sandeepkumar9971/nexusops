import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { loginRequest, fetchCurrentUser } from '../../services/authApi'
import { getToken, setToken, clearToken } from '../../services/authStorage'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  // 'loading' while we check an existing token, then 'authenticated' or 'guest'.
  const [status, setStatus] = useState('loading')

  const logout = useCallback(() => {
    clearToken()
    setUser(null)
    setStatus('guest')
  }, [])

  // On first load, if a token is already stored, validate it against the
  // API rather than trusting it blindly — it may have expired.
  useEffect(() => {
    const token = getToken()
    if (!token) {
      setStatus('guest')
      return
    }
    fetchCurrentUser()
      .then((fetchedUser) => {
        setUser(fetchedUser)
        setStatus('authenticated')
      })
      .catch(() => {
        clearToken()
        setStatus('guest')
      })
  }, [])

  // apiClient's response interceptor fires this on any 401 — e.g. the
  // token expires mid-session — so the app reacts immediately rather than
  // leaving the user looking at a dead page until their next click fails.
  useEffect(() => {
    const handleUnauthorized = () => logout()
    window.addEventListener('auth:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized)
  }, [logout])

  const login = async (email, password) => {
    const { token, user: loggedInUser } = await loginRequest(email, password)
    setToken(token)
    setUser(loggedInUser)
    setStatus('authenticated')
  }

  return (
    <AuthContext.Provider value={{ user, status, login, logout }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
