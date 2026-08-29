const asyncHandler = require("express-async-handler");
const { Role, User } = require("../models");
const { DEFAULT_ROLES, PERMISSIONS, defaultRole } = require("../config/accessControl");

const normalizePermissions = (permissions) => {
  if (!Array.isArray(permissions) || permissions.some((permission) => !PERMISSIONS.includes(permission))) {
    const error = new Error("Permissions must be a list of valid access areas");
    error.statusCode = 400;
    throw error;
  }
  return [...new Set(permissions)];
};

const listRoles = asyncHandler(async (req, res) => {
  const storedRoles = await Role.find().sort({ name: 1 });
  const storedByKey = new Map(storedRoles.map((role) => [role.key, role.toJSON()]));
  const roles = DEFAULT_ROLES.map((role) => storedByKey.get(role.key) || role);

  storedRoles.forEach((role) => {
    if (!defaultRole(role.key)) roles.push(role);
  });

  res.json({ success: true, data: roles, permissions: PERMISSIONS });
});

const createRole = asyncHandler(async (req, res) => {
  const { key, name, permissions } = req.body;
  const normalizedKey = String(key || "").trim().toLowerCase();
  if (!/^[a-z][a-z0-9_]*$/.test(normalizedKey) || !name?.trim()) {
    res.status(400);
    throw new Error("Role key and name are required; key may contain lowercase letters, numbers, and underscores");
  }
  if (defaultRole(normalizedKey)) {
    res.status(400);
    throw new Error("This built-in role already exists; edit it instead");
  }
  if (await Role.exists({ key: normalizedKey })) {
    res.status(400);
    throw new Error("A role with this key already exists");
  }

  const role = await Role.create({ key: normalizedKey, name: name.trim(), permissions: normalizePermissions(permissions) });
  res.status(201).json({ success: true, data: role });
});

const updateRole = asyncHandler(async (req, res) => {
  const key = req.params.key.toLowerCase();
  if (key === "admin") {
    res.status(400);
    throw new Error("Admin access is always enabled for every module");
  }
  const builtin = defaultRole(key);
  let role = await Role.findOne({ key });
  if (!role && !builtin) {
    res.status(404);
    throw new Error("Role not found");
  }
  const permissions = normalizePermissions(req.body.permissions);
  if (!role) role = new Role({ key, name: builtin.name, permissions });
  else {
    if (req.body.name?.trim()) role.name = req.body.name.trim();
    role.permissions = permissions;
  }
  await role.save();
  res.json({ success: true, data: role });
});

const deleteRole = asyncHandler(async (req, res) => {
  const key = req.params.key.toLowerCase();
  if (defaultRole(key)) {
    res.status(400);
    throw new Error("Built-in roles cannot be deleted");
  }
  const role = await Role.findOne({ key });
  if (!role) {
    res.status(404);
    throw new Error("Role not found");
  }
  if (await User.exists({ role: key })) {
    res.status(400);
    throw new Error("Reassign users before deleting this role");
  }
  await role.deleteOne();
  res.json({ success: true, message: "Role deleted" });
});

module.exports = { listRoles, createRole, updateRole, deleteRole };
