const jwt = require("jsonwebtoken");
const { User, Role } = require("../models");
const { defaultRole } = require("../config/accessControl");

const getPermissions = async (roleKey) => {
  if (roleKey === "admin") return ["*"];
  const role = await Role.findOne({ key: roleKey }).select("permissions");
  if (role?.permissions?.length) return role.permissions;
  return defaultRole(roleKey)?.permissions || [];
};

// Verifies JWT and attaches req.user
const protect = async (req, res, next) => {
  try {
    let token;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: "Not authorized, no token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({ success: false, message: "User no longer exists" });
    }

    if (user.status !== "active") {
      return res.status(403).json({ success: false, message: "Account is inactive, contact admin" });
    }

    req.user = user;
    req.user.permissions = await getPermissions(user.role);
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Not authorized, invalid or expired token" });
  }
};

// Restrict route to specific roles, e.g. authorize("admin")
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user ? req.user.role : "unknown"}' is not allowed to perform this action`,
      });
    }
    next();
  };
};

const requirePermission = (permission) => {
  return (req, res, next) => {
    if (req.user?.permissions?.includes("*") || req.user?.permissions?.includes(permission)) return next();
    return res.status(403).json({ success: false, message: `Your role does not have ${permission} access` });
  };
};

module.exports = { protect, authorize, requirePermission, getPermissions };
