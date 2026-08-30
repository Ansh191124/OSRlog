import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Drivers from './pages/Drivers'
import Vehicles from './pages/Vehicles'
import Maintenance from './pages/Maintenance'
import Payments from './pages/Payments'
import TripsList from './pages/trips/TripsList'
import TripDetail from './pages/trips/TripDetail'
import Users from './pages/Users'
import Roles from './pages/Roles'
import Inventory from './pages/Inventory'
import Approvals from './pages/Approvals'
import Fleets from './pages/Fleets'
import ChangePassword from './pages/ChangePassword'
import { canAccess, defaultRouteFor } from './lib/roles'

function Protected({ children, area }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (area && !canAccess(user, area)) return <Navigate to={defaultRouteFor(user)} replace />
  return <Layout>{children}</Layout>
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/change-password" element={<ChangePassword />} />
          <Route path="/" element={<Protected area="dashboard"><Dashboard /></Protected>} />
          <Route path="/users" element={<Protected area="users"><Users /></Protected>} />
          <Route path="/roles" element={<Protected area="users"><Roles /></Protected>} />
          <Route path="/inventory" element={<Protected area="inventory"><Inventory /></Protected>} />
          <Route path="/approvals" element={<Protected area="approvals"><Approvals /></Protected>} />
          <Route path="/fleets" element={<Protected area="fleets"><Fleets /></Protected>} />
          <Route path="/trips" element={<Protected area="trips"><TripsList /></Protected>} />
          <Route path="/trips/:id" element={<Protected area="trips"><TripDetail /></Protected>} />
          <Route path="/drivers" element={<Protected area="drivers"><Drivers /></Protected>} />
          <Route path="/vehicles" element={<Protected area="vehicles"><Vehicles /></Protected>} />
          <Route path="/maintenance" element={<Protected area="maintenance"><Maintenance /></Protected>} />
          <Route path="/payments" element={<Protected area="payments"><Payments /></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  )
}
