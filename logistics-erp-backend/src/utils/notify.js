import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { emitToUser } from "./socket.js";
import { ROLES, EMPLOYEE_CATEGORIES } from "../config/roles.js";

// Creates a persisted notification for one user and pushes it live over
// Socket.IO if they're connected.
export async function notifyUser(userId, { title, message, type = "general", link = null }) {
  const notification = await Notification.create({ recipient: userId, title, message, type, link });
  emitToUser(userId, "notification", notification);
  return notification;
}

async function notifyMany(userIds, payload) {
  await Promise.all(userIds.map((id) => notifyUser(id, payload)));
}

export async function notifyAdmins(payload) {
  const admins = await User.find({ role: { $in: [ROLES.ADMIN, ROLES.CO_ADMIN] } }).select("_id");
  await notifyMany(admins.map((u) => u._id), payload);
}

export async function notifyAccountants(payload) {
  const accountants = await User.find({ role: ROLES.EMPLOYEE, employeeCategory: EMPLOYEE_CATEGORIES.ACCOUNTANT }).select("_id");
  await notifyMany(accountants.map((u) => u._id), payload);
}

export async function notifyVehicleMasters(vehicleMasterIds, payload) {
  await notifyMany(vehicleMasterIds, payload);
}
