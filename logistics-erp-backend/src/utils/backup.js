import fs from "fs/promises";
import path from "path";
import mongoose from "mongoose";
import { uploadBuffer } from "./s3.js";

// Daily disaster-recovery backup: dumps every collection to timestamped JSON
// files (locally, and to S3 when configured). Doesn't depend on the
// `mongodump` binary being installed, so it works the same in any environment.
export async function runBackup() {
  if (mongoose.connection.readyState !== 1) {
    console.warn("[backup] Skipped — no active MongoDB connection.");
    return { skipped: true };
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = path.resolve("backups", timestamp);
  await fs.mkdir(outDir, { recursive: true });

  const collections = await mongoose.connection.db.listCollections().toArray();
  let totalDocs = 0;

  for (const { name } of collections) {
    const docs = await mongoose.connection.db.collection(name).find({}).toArray();
    const json = JSON.stringify(docs, null, 2);
    await fs.writeFile(path.join(outDir, `${name}.json`), json, "utf8");
    await uploadBuffer(`backups/${timestamp}/${name}.json`, Buffer.from(json), "application/json");
    totalDocs += docs.length;
  }

  console.log(`[backup] Completed: ${collections.length} collections, ${totalDocs} documents -> ${outDir}`);
  return { skipped: false, outDir, collections: collections.length, totalDocs };
}
