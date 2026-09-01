import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Circle, Loader2, Truck } from 'lucide-react'
import { ServerStatusAPI } from '../lib/api'

export default function Login() {
  const { login, loading, error } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [serverStatus, setServerStatus] = useState('checking')
  const [desktopRequired, setDesktopRequired] = useState(false)

  useEffect(() => {
    let active = true
    const checkServer = async () => {
      try {
        const response = await ServerStatusAPI.status()
        const data = response?.data?.data ?? response?.data ?? {}
        const status = String(data.status ?? data.health ?? data.state ?? '').toLowerCase()
        const online = data.success === true || !status || ['ok', 'healthy', 'up', 'running', 'online', 'success'].includes(status)
        if (active) setServerStatus(online ? 'online' : 'offline')
      } catch {
        if (active) setServerStatus('offline')
      }
    }
    checkServer()
    const timer = window.setInterval(checkServer, 30000)
    return () => { active = false; window.clearInterval(timer) }
  }, [])

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)')
    const update = () => setDesktopRequired(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  const onSubmit = async (e) => {
    e.preventDefault()
    if (desktopRequired) return
    const result = await login(email, password)
    if (result.ok) navigate(result.forcePasswordChange ? '/change-password' : '/')
  }

  return (
    <div className="min-h-screen bg-asphalt flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.06]" style={{
        backgroundImage: 'repeating-linear-gradient(90deg, #fff 0 2px, transparent 2px 64px)'
      }} />
      <div className="w-full max-w-sm relative">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-2.5 h-2.5 rounded-full bg-accent" />
          <span className="font-display text-2xl text-white tracking-wide">OSR LOGISTICS</span>
        </div>

        <form onSubmit={onSubmit} className="card p-6 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-accent-deep mb-1">Sign in</p>
            <h1 className="font-display text-2xl text-ink">Dispatch access</h1>
          </div>

          {error && (
            <div className="text-sm text-negative bg-negative-soft border border-negative/20 rounded px-3 py-2">
              {error}
            </div>
          )}
          {location.state?.passwordChanged && (
            <div className="text-sm text-positive bg-positive-soft border border-positive/20 rounded px-3 py-2">Password updated. Sign in with your new password.</div>
          )}
          {desktopRequired && (
            <div className="text-sm text-accent-deep bg-accent-soft border border-accent/20 rounded px-3 py-2">Please open OSR Logistics on a desktop or laptop to sign in.</div>
          )}

          <div>
            <span className="label-field">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="you@company.com"
            />
          </div>
          <div>
            <span className="label-field">Password</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading || desktopRequired}
            className="btn-accent w-full rounded py-2.5 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
            {loading ? 'Checking manifest…' : 'Sign in'}
          </button>

        </form>
      </div>

      <div className="fixed right-4 bottom-4 flex items-center gap-2 rounded-full border border-white/15 bg-asphalt-3/95 px-3 py-2 text-xs font-medium text-white shadow-lg" aria-live="polite">
        <Circle className={`w-2.5 h-2.5 fill-current ${serverStatus === 'online' ? 'text-positive' : serverStatus === 'offline' ? 'text-negative' : 'text-accent animate-pulse'}`} />
        <span>Server {serverStatus === 'online' ? 'online' : serverStatus === 'offline' ? 'offline' : 'checking…'}</span>
      </div>
    </div>
  )
}
