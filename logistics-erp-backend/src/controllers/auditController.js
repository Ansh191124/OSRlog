import AuditLog from "../models/AuditLog.js";

// Admin: audit trail of trip edits/deletes and access changes.
export async function listAuditLogs(req, res) {
  const logs = await AuditLog.find().populate("user", "name email").sort({ at: -1 }).limit(200);
  res.json({ logs });
}
