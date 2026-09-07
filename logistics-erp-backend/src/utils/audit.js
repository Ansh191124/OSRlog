import AuditLog from "../models/AuditLog.js";

export async function recordAudit({ user, action, entityType, entityId, before = null, after = null }) {
  try {
    await AuditLog.create({ user: user._id, action, entityType, entityId, before, after });
  } catch (err) {
    console.error("[audit] Failed to record audit log:", err.message);
  }
}
