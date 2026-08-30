export const ROLES = {
  admin: 'Admin',
  employee: 'Employee',
  entry_employee: 'Entry employee',
  accountant: 'Accountant',
  co_admin: 'Co-admin',
  client: 'Client',
}

export const ROLE_ACCESS = {
  admin: ['dashboard', 'users', 'drivers', 'vehicles', 'trips', 'payments', 'maintenance', 'inventory', 'approvals', 'fleets'],
  co_admin: ['dashboard', 'drivers', 'vehicles', 'trips', 'payments', 'maintenance', 'inventory', 'approvals', 'fleets'],
  employee: ['drivers', 'vehicles', 'maintenance', 'inventory', 'approvals', 'fleets'],
  entry_employee: ['trips'],
  accountant: ['payments', 'approvals'],
  client: ['fleets', 'approvals', 'payments'],
}

export function canAccess(user, area) {
  if (user?.permissions) return user.permissions.includes('*') || user.permissions.includes(area)
  return Boolean(user?.role && ROLE_ACCESS[user.role]?.includes(area))
}

export function defaultRouteFor(user) {
  if (canAccess(user, 'dashboard')) return '/'
  if (canAccess(user, 'drivers')) return '/drivers'
  if (canAccess(user, 'trips')) return '/trips'
  if (canAccess(user, 'payments')) return '/payments'
  return '/login'
}
