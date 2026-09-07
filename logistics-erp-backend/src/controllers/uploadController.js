import crypto from "crypto";
import { uploadBuffer } from "../utils/s3.js";

// Generic authenticated file upload (payment/ledger proofs). Stores to S3 when
// configured; always returns a stable key so the reference can be saved even
// before real AWS credentials are set.
export async function uploadProof(req, res) {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  const ext = (req.file.originalname.split(".").pop() || "bin").toLowerCase();
  const key = `proofs/${req.user._id}/${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${ext}`;
  const result = await uploadBuffer(key, req.file.buffer, req.file.mimetype);

  // In dev (no AWS yet), uploadBuffer returns a data URI as the real, usable
  // key instead of the S3 path above — always echo back what it actually gave us.
  res.status(201).json({ key: result.key, stored: result.stored });
}
