import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { signToken } from "../utils/jwt.js";

export async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user || !user.isActive) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const valid = await user.comparePassword(password);
  if (!valid) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = signToken(user);
  res.json({ token, user: user.toSafeJSON(), scope: user.effectiveScope() });
}

export async function me(req, res) {
  res.json({ user: req.user.toSafeJSON(), scope: req.scope });
}

// Helper used by the seed script — not exposed as a public route.
export async function createUserWithPassword(fields, plainPassword) {
  const passwordHash = await bcrypt.hash(plainPassword, 10);
  return User.create({ ...fields, passwordHash });
}
