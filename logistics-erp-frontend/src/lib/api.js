import axios from 'axios'
import { cacheResponse, invalidateCache, readCached } from './requestCache'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
export const SERVER_ROOT_URL = BASE_URL.replace(/\/api\/?$/, '')

export const api = axios.create({ baseURL: BASE_URL })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('erp_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.request.use((config) => {
  if (config.method?.toLowerCase() !== 'get' || config.skipCache) return config
  const cached = readCached(config)
  if (cached) {
    config.adapter = () => Promise.resolve({ ...cached, config, request: null })
  }
  return config
})

api.interceptors.response.use(
  (res) => {
    if (res.config.method?.toLowerCase() === 'get' && !res.config.skipCache) cacheResponse(res.config, res)
    if (res.config.method?.toLowerCase() !== 'get') invalidateCache('/drivers', '/vehicles', '/trips', '/payments', '/dashboard', '/maintenance', '/inventory', '/approvals', '/fleets')
    return res
  },
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem('erp_token')
      localStorage.removeItem('erp_user')
      if (!window.location.hash.includes('/login')) {
        window.location.hash = '#/login'
      }
    }
    return Promise.reject(err)
  }
)

// ---- Auth ----
export const AuthAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (payload) => api.post('/auth/register', payload),
  me: () => api.get('/auth/me'),
  changePassword: (currentPassword, newPassword) => api.put('/auth/change-password', { currentPassword, newPassword }),
}

// Admin-only on the API. Kept separate from public sign-up semantics.
export const UsersAPI = {
  list: (params) => api.get('/users', { params }),
  create: (payload) => api.post('/users', payload),
  update: (id, payload) => api.put(`/users/${id}`, payload),
}

export const RolesAPI = {
  list: () => api.get('/roles'),
  create: (payload) => api.post('/roles', payload),
  update: (key, payload) => api.put(`/roles/${key}`, payload),
  remove: (key) => api.delete(`/roles/${key}`),
}

export const InventoryAPI = {
  list: () => api.get('/inventory'),
  add: (payload) => api.post('/inventory', payload),
}

export const ApprovalsAPI = {
  list: (params) => api.get('/approvals', { params }), create: (payload) => api.post('/approvals', payload),
  approve: (id) => api.put(`/approvals/${id}/approve`), reject: (id, reason) => api.put(`/approvals/${id}/reject`, { reason }), pay: (id, payload) => api.put(`/approvals/${id}/pay`, payload),
}

export const FleetsAPI = {
  list: () => api.get('/fleets'), create: (payload) => api.post('/fleets', payload),
  update: (id, payload) => api.put(`/fleets/${id}`, payload), assign: (id, payload) => api.put(`/fleets/${id}/assign`, payload),
}

export const OrgSettingsAPI = {
  fleetPool: () => api.get('/settings/fleet-pool'),
  updateFleetPool: (payload) => api.put('/settings/fleet-pool', payload),
}

// ---- Drivers ----
export const DriversAPI = {
  list: (params) => api.get('/drivers', { params }),
  get: (id) => api.get(`/drivers/${id}`),
  create: (payload) => api.post('/drivers', payload),
  update: (id, payload) => api.put(`/drivers/${id}`, payload),
  remove: (id) => api.delete(`/drivers/${id}`),
  uploadPhoto: (id, formData) => api.post(`/drivers/${id}/photo`, formData),
  uploadLicense: (id, formData) => api.post(`/drivers/${id}/license-doc`, formData),
}

// ---- Vehicles ----
export const VehiclesAPI = {
  list: (params) => api.get('/vehicles', { params }),
  expiringDocs: (days = 30) => api.get('/vehicles/expiring-documents', { params: { days } }),
  get: (id) => api.get(`/vehicles/${id}`),
  create: (payload) => api.post('/vehicles', payload),
  update: (id, payload) => api.put(`/vehicles/${id}`, payload),
  remove: (id) => api.delete(`/vehicles/${id}`),
  uploadPhoto: (id, formData) => api.post(`/vehicles/${id}/photo`, formData),
  uploadDocument: (id, formData) => api.post(`/vehicles/${id}/document`, formData),
}

// ---- Trips ----
export const TripsAPI = {
  list: (params) => api.get('/trips', { params }),
  get: (id) => api.get(`/trips/${id}`),
  create: (payload) => api.post('/trips', payload),
  update: (id, payload) => api.put(`/trips/${id}`, payload),
  remove: (id) => api.delete(`/trips/${id}`),
  addEntry: (id, payload) => api.post(`/trips/${id}/entries`, payload),
  updateEntry: (id, entryId, payload) => api.put(`/trips/${id}/entries/${entryId}`, payload),
  removeEntry: (id, entryId) => api.delete(`/trips/${id}/entries/${entryId}`),
  setExpense: (id, payload) => api.put(`/trips/${id}/expense`, payload),
  setSummary: (id, payload) => api.put(`/trips/${id}/summary`, payload),
  calculate: (id) => api.post(`/trips/${id}/calculate`),
  // Appends an immutable handover record; it must not overwrite the trip's original driver.
  changeDriver: (id, payload) => api.post(`/trips/${id}/driver-changes`, payload),
}

// ---- Maintenance ----
export const MaintenanceAPI = {
  list: (params) => api.get('/maintenance', { params }),
  alerts: (days = 15) => api.get('/maintenance/alerts', { params: { days } }),
  get: (id) => api.get(`/maintenance/${id}`),
  create: (payload) => api.post('/maintenance', payload),
  update: (id, payload) => api.put(`/maintenance/${id}`, payload),
  remove: (id) => api.delete(`/maintenance/${id}`),
  uploadInvoice: (id, formData) => api.post(`/maintenance/${id}/invoice`, formData),
}

// ---- Payments ----
export const PaymentsAPI = {
  list: (params) => api.get('/payments', { params }),
  summary: (params) => api.get('/payments/summary', { params }),
  get: (id) => api.get(`/payments/${id}`),
  create: (payload) => api.post('/payments', payload),
  update: (id, payload) => api.put(`/payments/${id}`, payload),
  remove: (id) => api.delete(`/payments/${id}`),
  uploadReceipt: (id, formData) => api.post(`/payments/${id}/receipt`, formData),
  verify: (id, payload) => api.put(`/payments/${id}/verify`, payload),
  uploadReceipt: (id, formData) => api.post(`/payments/${id}/receipt`, formData),
}

// ---- Dashboard ----
export const DashboardAPI = {
  summary: (params) => api.get('/dashboard/summary', { params }),
  trend: (params) => api.get('/dashboard/trend', { params }),
  overview: () => api.get('/dashboard/overview'),
  vehiclePerformance: (params) => api.get('/dashboard/vehicle-performance', { params }),
}

// ---- Server ----
export const ServerStatusAPI = {
  // The health endpoint is mounted on the Express app, outside its /api router.
  status: () => axios.get(`${SERVER_ROOT_URL}/health`),
}
