const DEFAULT_ROLES = [
  { key: "admin", name: "Admin", permissions: ["*"] },
  { key: "employee", name: "Employee", permissions: ["drivers", "vehicles", "maintenance", "inventory", "approvals", "fleets"] },
  { key: "entry_employee", name: "Entry employee", permissions: ["trips"] },
  { key: "accountant", name: "Accountant", permissions: ["payments", "approvals"] },
  { key: "co_admin", name: "Co-admin", permissions: ["dashboard", "drivers", "vehicles", "trips", "maintenance", "inventory", "payments", "approvals", "fleets"] },
];

const PERMISSIONS = ["dashboard", "users", "drivers", "vehicles", "trips", "maintenance", "inventory", "payments", "approvals", "fleets"];
const defaultRole = (key) => DEFAULT_ROLES.find((role) => role.key === key);

module.exports = { DEFAULT_ROLES, PERMISSIONS, defaultRole };
