// Central role/category constants, mirrored on the frontend.

export const ROLES = {
  ADMIN: "admin",
  CO_ADMIN: "co_admin",
  EMPLOYEE: "employee",
  CLIENT: "client",
  DRIVER: "driver",
};

// Employee categories per the requirements doc:
// I -> Vehicle Master, II -> Entry Master, III -> Accountant, IV -> Temporary (assumes Admin/Co-Admin scope)
export const EMPLOYEE_CATEGORIES = {
  VEHICLE_MASTER: "vehicle_master",
  ENTRY_MASTER: "entry_master",
  ACCOUNTANT: "accountant",
  TEMPORARY: "temporary",
};

export const ALL_ROLE_KEYS = [
  ROLES.ADMIN,
  ROLES.CO_ADMIN,
  EMPLOYEE_CATEGORIES.VEHICLE_MASTER,
  EMPLOYEE_CATEGORIES.ENTRY_MASTER,
  EMPLOYEE_CATEGORIES.ACCOUNTANT,
  ROLES.CLIENT,
  ROLES.DRIVER,
];
