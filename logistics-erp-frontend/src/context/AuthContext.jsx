import { createContext, useContext, useState, useCallback } from 'react'
import { AuthAPI } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('erp_user')
    return raw ? JSON.parse(raw) : null
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const login = useCallback(async (email, password) => {
  setLoading(true)
  setError(null)
  try {
    const res = await AuthAPI.login(email, password)

    if (!res.data?.success) {
      setError(res.data?.message || 'Could not sign in.')
      return false
    }

    const { token, ...u } = res.data.data // separate token from the rest of the user fields

    localStorage.setItem('erp_token', token)
    localStorage.setItem('erp_user', JSON.stringify(u))
    setUser(u)

    return { ok: true, forcePasswordChange: Boolean(u.forcePasswordChange) }
  } catch (err) {
    setError(err?.response?.data?.message || 'Could not sign in. Check your credentials and the API connection.')
    return { ok: false }
  } finally {
    setLoading(false)
  }
}, [])

  const logout = useCallback(() => {
    localStorage.removeItem('erp_token')
    localStorage.removeItem('erp_user')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, error }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
