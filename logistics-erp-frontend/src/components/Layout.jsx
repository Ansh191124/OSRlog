import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Route, Users, Truck, Wrench, Wallet, UserCog, Package, ClipboardCheck, Building2, LogOut, Menu, X, BadgeCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useState } from 'react'
import { canAccess } from '../lib/roles'

const NAV = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true, area: 'dashboard' },
  { to: '/users', label: 'User access', icon: UserCog, area: 'users' },
  { to: '/roles', label: 'Roles & access', icon: UserCog, area: 'users' },
  { to: '/trips', label: 'Trip Sheets', icon: Route, area: 'trips' },
  { to: '/drivers', label: 'Drivers', icon: Users, area: 'drivers' },
  { to: '/vehicles', label: 'Vehicles', icon: Truck, area: 'vehicles' },
  { to: '/maintenance', label: 'Maintenance', icon: Wrench, area: 'maintenance' },
  { to: '/inventory', label: 'Inventory', icon: Package, area: 'inventory' },
  { to: '/approvals', label: 'Approvals', icon: ClipboardCheck, area: 'approvals' },
  { to: '/fleets', label: 'Client fleets', icon: Building2, area: 'fleets' },
  { to: '/payments', label: 'Cashbook', icon: Wallet, area: 'payments' },
]

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const doLogout = () => {
    if (!window.confirm('Sign out of OSR Logistics?')) return
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex bg-paper">
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 h-14 bg-asphalt text-white flex items-center justify-between px-4 z-40">
        <span className="font-display text-lg tracking-wide">OSR LOGISTICS</span>
        <button onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed md:sticky top-0 md:top-0 h-screen w-64 bg-asphalt text-white flex flex-col z-30
        transition-transform duration-200 ease-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
      `}>
        <div className="hidden md:flex items-center gap-2 px-6 py-6 border-b border-white/10">
          <div className="w-8 h-8 rounded-md bg-accent/15 border border-accent/30 flex items-center justify-center">
            <Truck className="w-4 h-4 text-accent" />
          </div>
          <span className="font-display text-xl tracking-wide">OSR LOGISTICS</span>
        </div>
        <div className="md:hidden h-14" />

        <nav className="sidebar-scroll flex-1 px-4 py-6 overflow-y-auto">
          <div className="relative pl-4">
            <div className="absolute left-[7px] top-2 bottom-2 route-dashes" aria-hidden="true" />
            <ul className="space-y-1">
              {NAV.filter(({ area }) => !area || canAccess(user, area)).map(({ to, label, icon: Icon, end }) => (
                <li key={to} className="relative">
                  <NavLink
                    to={to}
                    end={end}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-r text-sm font-medium transition-colors relative
                       ${isActive ? 'bg-accent/90 text-white shadow-sm ring-1 ring-accent/40' : 'text-white/60 hover:text-white hover:bg-white/5'}`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span className={`absolute -left-[17px] w-2.5 h-2.5 rounded-full border-2 ${isActive ? 'bg-accent border-accent' : 'bg-asphalt border-white/30'}`} />
                        {isActive ? <BadgeCheck className="w-4 h-4 shrink-0" /> : <Icon className="w-4 h-4 shrink-0" />}
                        <span>{label}</span>
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center justify-between gap-2 rounded border border-white/15 bg-white/5 px-3 py-2 mb-1">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{user?.name || user?.email || 'User'}</p>
              <p className="text-xs text-white/50 capitalize truncate">{user?.role || 'member'}</p>
            </div>
            <button
              onClick={doLogout}
              aria-label="Sign out"
              title="Sign out"
              className="shrink-0 p-1.5 rounded text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 bg-black/40 z-20 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Main content */}
      <main className="flex-1 min-w-0 pt-14 md:pt-0">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-10">
          {children}
        </div>
      </main>
    </div>
  )
}
