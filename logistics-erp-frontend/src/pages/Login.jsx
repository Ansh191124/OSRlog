import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Loader2, Truck } from 'lucide-react'

export default function Login() {
  const { login, loading, error } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('admin@logistics.com')
  const [password, setPassword] = useState('')

  const onSubmit = async (e) => {
    e.preventDefault()
    const ok = await login(email, password)
    if (ok) navigate('/')
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
            disabled={loading}
            className="btn-accent w-full rounded py-2.5 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
            {loading ? 'Checking manifest…' : 'Sign in'}
          </button>

          <p className="text-xs text-steel text-center pt-1">
            Default seeded admin: admin@logistics.com / Admin@123
          </p>
        </form>
      </div>
    </div>
  )
}
