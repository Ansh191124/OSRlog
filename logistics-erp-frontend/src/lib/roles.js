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
  client: ['dashboard', 'fleets', 'approvals', 'payments'],
}

export function canAccess(user, area) {
  const perms = user?.permissions
  if (Array.isArray(perms) && perms.length > 0) {
    return perms.includes('*') || perms.includes(area)
  }
  return Boolean(user?.role && ROLE_ACCESS[user.role]?.includes(area))
}

const ROUTE_PRIORITY = [
  ['dashboard', '/'],
  ['fleets', '/fleets'],
  ['trips', '/trips'],
  ['payments', '/payments'],
  ['approvals', '/approvals'],
  ['drivers', '/drivers'],
  ['vehicles', '/vehicles'],
  ['maintenance', '/maintenance'],
  ['inventory', '/inventory'],
  ['users', '/users'],
]

export function defaultRouteFor(user) {
  for (const [area, path] of ROUTE_PRIORITY) {
    if (canAccess(user, area)) return path
  }
  return '/login'
}
