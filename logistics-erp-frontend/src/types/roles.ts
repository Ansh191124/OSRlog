// Mirrors backend/src/config/roles.js — keep in sync.

export const ROLES = {
  ADMIN: "admin",
  CO_ADMIN: "co_admin",
  EMPLOYEE: "employee",
  CLIENT: "client",
  DRIVER: "driver",
} as const;

export const EMPLOYEE_CATEGORIES = {
  VEHICLE_MASTER: "vehicle_master",
  ENTRY_MASTER: "entry_master",
  ACCOUNTANT: "accountant",
  TEMPORARY: "temporary",
} as const;

// The effective RBAC scope a logged-in user is checked against.
export type Scope =
  | typeof ROLES.ADMIN
  | typeof ROLES.CO_ADMIN
  | typeof EMPLOYEE_CATEGORIES.VEHICLE_MASTER
  | typeof EMPLOYEE_CATEGORIES.ENTRY_MASTER
  | typeof EMPLOYEE_CATEGORIES.ACCOUNTANT
  | typeof ROLES.CLIENT
  | typeof ROLES.DRIVER;

export const SCOPE_LABELS: Record<Scope, string> = {
  admin: "Admin",
  co_admin: "Co-Admin",
  vehicle_master: "Vehicle Master",
  entry_master: "Entry Master",
  accountant: "Accountant",
  client: "Client",
  driver: "Driver",
};
