import "dotenv/config";
import http from "http";
import cron from "node-cron";
import mongoose from "mongoose";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { initSocket } from "./utils/socket.js";
import { runBackup } from "./utils/backup.js";

const PORT = process.env.PORT || 5000;

// Defense in depth: a route handler missed by asyncHandler should log, not crash the process.
process.on("unhandledRejection", (err) => {
  console.error("[server] Unhandled rejection:", err);
});

async function start() {
  await connectDB();

  const httpServer = http.createServer(app);
  initSocket(httpServer);

  // Daily disaster-recovery backup at 2 AM server time — only runs once the DB
  // is actually connected; a placeholder MONGODB_URI just logs a skip notice.
  cron.schedule("0 2 * * *", () => {
    if (mongoose.connection.readyState === 1) {
      runBackup().catch((err) => console.error("[backup] Failed:", err));
    } else {
      console.warn("[backup] Skipped scheduled run — MongoDB not connected.");
    }
  });

  httpServer.listen(PORT, () => {
    console.log(`[server] OSR Logistics API listening on port ${PORT}`);
  });
}

start();
