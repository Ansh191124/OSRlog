export const ROLES = {
  admin: 'Admin',
  employee: 'Employee',
  entry_employee: 'Entry employee',
  accountant: 'Accountant',
}

export const ROLE_ACCESS = {
  admin: ['dashboard', 'users', 'drivers', 'vehicles', 'trips', 'payments', 'maintenance'],
  employee: ['drivers', 'vehicles'],
  entry_employee: ['trips'],
  accountant: ['payments'],
}

export function canAccess(user, area) {
  return Boolean(user?.role && ROLE_ACCESS[user.role]?.includes(area))
}

export function defaultRouteFor(user) {
  if (canAccess(user, 'dashboard')) return '/'
  if (canAccess(user, 'drivers')) return '/drivers'
  if (canAccess(user, 'trips')) return '/trips'
  if (canAccess(user, 'payments')) return '/payments'
  return '/login'
}
