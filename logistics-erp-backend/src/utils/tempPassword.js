import crypto from "crypto";

// Generates a readable one-time temporary password for newly created accounts
// (drivers, clients, employees). Returned once in the create response so the
// creator (Entry Master/Admin/Co-Admin) can hand it to the person directly.
export function generateTempPassword() {
  return crypto.randomBytes(6).toString("base64url") + "!1";
}
