import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { AuthAPI } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('erp_user')
    return raw ? JSON.parse(raw) : null
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const persistUser = useCallback((next) => {
    if (next) localStorage.setItem('erp_user', JSON.stringify(next))
    else localStorage.removeItem('erp_user')
    setUser(next)
  }, [])

  const refreshSession = useCallback(async () => {
    const token = localStorage.getItem('erp_token')
    if (!token) return null
    try {
      const res = await AuthAPI.me()
      const data = res.data?.data
      if (!data) return null
      const raw = localStorage.getItem('erp_user')
      const prev = raw ? JSON.parse(raw) : {}
      const next = { ...prev, ...data }
      persistUser(next)
      return next
    } catch {
      return null
    }
  }, [persistUser])

  useEffect(() => {
    if (!localStorage.getItem('erp_token')) return
    refreshSession()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- refresh once on load

  useEffect(() => {
    const onFocus = () => { refreshSession() }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refreshSession])

  const login = useCallback(async (email, password) => {
    setLoading(true)
    setError(null)
    try {
      const res = await AuthAPI.login(email, password)

      if (!res.data?.success) {
        setError(res.data?.message || 'Could not sign in.')
        return { ok: false }
      }

      const { token, ...u } = res.data.data

      localStorage.setItem('erp_token', token)
      persistUser(u)

      return { ok: true, forcePasswordChange: Boolean(u.forcePasswordChange), user: u }
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not sign in. Check your credentials and the API connection.')
      return { ok: false }
    } finally {
      setLoading(false)
    }
  }, [persistUser])

  const logout = useCallback(() => {
    localStorage.removeItem('erp_token')
    persistUser(null)
  }, [persistUser])

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, error, refreshSession }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
