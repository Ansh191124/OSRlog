const asyncHandler = require("express-async-handler");
const { User, Role } = require("../models");
const { defaultRole } = require("../config/accessControl");

const roleExists = async (role) => Boolean(defaultRole(role) || await Role.exists({ key: role }));

// @route  GET /api/users
// @desc   List users, newest first (admin only)
const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select("-password").sort({ createdAt: -1 });

  res.json({
    success: true,
    count: users.length,
    data: users,
  });
});

// @route  POST /api/users
// @desc   Create a user and assign a role category (admin only)
const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, phone, role, category } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error("name, email and password are required");
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    res.status(400);
    throw new Error("A user with this email already exists");
  }

  const requestedRole = role || category;
  if (requestedRole && !(await roleExists(requestedRole))) {
    res.status(400);
    throw new Error("Invalid user role category");
  }

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password,
    phone,
    role: requestedRole || "employee",
  });

  res.status(201).json({ success: true, data: user });
});

// @route  PUT /api/users/:id
// @desc   Update a user's information and role category (admin only)
const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const { name, email, phone, status, password, role, category } = req.body;
  const requestedRole = role || category;

  if (requestedRole && !(await roleExists(requestedRole))) {
    res.status(400);
    throw new Error("Invalid user role category");
  }
  if (status && !["active", "inactive"].includes(status)) {
    res.status(400);
    throw new Error("Invalid user status");
  }
  if (String(user._id) === String(req.user._id) && (requestedRole && requestedRole !== "admin" || status === "inactive")) {
    res.status(400);
    throw new Error("You cannot remove or deactivate your own admin access");
  }

  if (email && email.toLowerCase().trim() !== user.email) {
    const existing = await User.findOne({ email: email.toLowerCase().trim(), _id: { $ne: user._id } });
    if (existing) {
      res.status(400);
      throw new Error("A user with this email already exists");
    }
    user.email = email.toLowerCase().trim();
  }

  if (name !== undefined) user.name = name.trim();
  if (phone !== undefined) user.phone = phone;
  if (status !== undefined) user.status = status;
  if (requestedRole !== undefined) user.role = requestedRole;
  if (password) { user.password = password; user.forcePasswordChange = true; }

  await user.save();
  res.json({ success: true, data: user });
});

module.exports = { getUsers, createUser, updateUser };
