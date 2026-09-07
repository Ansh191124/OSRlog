import User from "../models/User.js";
import { ROLES, EMPLOYEE_CATEGORIES } from "../config/roles.js";
import { recordAudit } from "../utils/audit.js";

// Employees only — Roles & Access assigns/changes employeeCategory and the
// temporary-employee Admin/Co-Admin scope. Admin has full access; Co-Admin
// cannot touch any user whose role is admin (explicit doc restriction).
export async function listEmployees(req, res) {
  const employees = await User.find({ role: ROLES.EMPLOYEE }).sort({ createdAt: -1 });
  res.json({ employees: employees.map((u) => u.toSafeJSON()) });
}

export async function updateAccess(req, res) {
  const { id } = req.params;
  const { employeeCategory, isTemporary, temporaryScope } = req.body;

  const target = await User.findById(id);
  if (!target || target.role !== ROLES.EMPLOYEE) {
    return res.status(404).json({ message: "Employee not found" });
  }

  if (req.scope === ROLES.CO_ADMIN && target.role === ROLES.ADMIN) {
    return res.status(403).json({ message: "Co-Admin cannot change Admin's access" });
  }

  if (employeeCategory !== undefined) {
    if (employeeCategory !== null && !Object.values(EMPLOYEE_CATEGORIES).includes(employeeCategory)) {
      return res.status(400).json({ message: "Invalid employee category" });
    }
    target.employeeCategory = employeeCategory;
  }

  if (isTemporary !== undefined) {
    target.isTemporary = Boolean(isTemporary);
  }

  if (temporaryScope !== undefined) {
    if (temporaryScope !== null && ![ROLES.ADMIN, ROLES.CO_ADMIN].includes(temporaryScope)) {
      return res.status(400).json({ message: "temporaryScope must be admin or co_admin" });
    }
    target.temporaryScope = temporaryScope;
  }

  const before = { employeeCategory: target.employeeCategory, isTemporary: target.isTemporary, temporaryScope: target.temporaryScope };
  await target.save();
  await recordAudit({
    user: req.user,
    action: "employee.access.update",
    entityType: "User",
    entityId: target._id,
    before,
    after: { employeeCategory: target.employeeCategory, isTemporary: target.isTemporary, temporaryScope: target.temporaryScope },
  });

  res.json({ user: target.toSafeJSON() });
}
