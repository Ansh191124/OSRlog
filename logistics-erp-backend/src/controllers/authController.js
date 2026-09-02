const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const { User, Role } = require("../models");
const { defaultRole } = require("../config/accessControl");
const { getPermissions } = require("../middlewares/auth");

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

const roleExists = async (role) => Boolean(defaultRole(role) || await Role.exists({ key: role }));

// @route  POST /api/auth/register
// @desc   Create a new employee/admin account (admin only)
const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, phone } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error("name, email and password are required");
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    res.status(400);
    throw new Error("A user with this email already exists");
  }
  if (role && !(await roleExists(role))) {
    res.status(400);
    throw new Error("Invalid user role category");
  }

  const user = await User.create({
    name,
    email,
    password,
    phone,
    role: role || "employee",
  });

  res.status(201).json({
    success: true,
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      permissions: await getPermissions(user.role),
      forcePasswordChange: user.forcePasswordChange !== false,
      token: signToken(user._id),
    },
  });
});

// @route  POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("email and password are required");
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !(await user.comparePassword(password))) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  if (user.status !== "active") {
    res.status(403);
    throw new Error("Account is inactive, contact admin");
  }

  res.json({
    success: true,
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      permissions: await getPermissions(user.role),
      forcePasswordChange: user.forcePasswordChange !== false,
      token: signToken(user._id),
    },
  });
});

// @route  GET /api/auth/me
const me = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone,
      role: req.user.role,
      permissions: req.user.permissions,
      forcePasswordChange: req.user.forcePasswordChange !== false,
    },
  });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword || newPassword.length < 8) {
    res.status(400); throw new Error("Current password and a new password of at least 8 characters are required");
  }
  const user = await User.findById(req.user._id);
  if (!(await user.comparePassword(currentPassword))) {
    res.status(400); throw new Error("Current password is incorrect");
  }
  user.password = newPassword;
  user.forcePasswordChange = false;
  await user.save();
  res.json({ success: true, message: "Password updated. Please sign in again." });
});

module.exports = { register, login, me, changePassword };
