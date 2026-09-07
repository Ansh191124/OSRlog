import { verifyToken } from "../utils/jwt.js";
import User from "../models/User.js";

// Verifies the JWT and attaches req.user (full Mongoose doc) + req.scope (effective RBAC scope).
export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: "Missing auth token" });

    const payload = verifyToken(token);
    const user = await User.findById(payload.sub);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Invalid or inactive user" });
    }

    req.user = user;
    req.scope = user.effectiveScope();
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

// Restricts a route to one or more RBAC scopes (admin, co_admin, vehicle_master,
// entry_master, accountant, client, driver). Server-side enforcement is authoritative —
// the frontend hiding a button is not a substitute for this check.
export function requireScope(...allowedScopes) {
  return (req, res, next) => {
    if (!req.scope || !allowedScopes.includes(req.scope)) {
      return res.status(403).json({ message: "Forbidden: insufficient role permissions" });
    }
    next();
  };
}
