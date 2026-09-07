import express from "express";
import cors from "cors";
import morgan from "morgan";
import authRoutes from "./routes/authRoutes.js";
import vehicleRoutes from "./routes/vehicleRoutes.js";
import driverRoutes from "./routes/driverRoutes.js";
import { createPeopleRoutes } from "./routes/peopleRoutes.js";
import accessRoutes from "./routes/accessRoutes.js";
import maintenanceRoutes from "./routes/maintenanceRoutes.js";
import tripRoutes from "./routes/tripRoutes.js";
import inventoryRoutes from "./routes/inventoryRoutes.js";
import inventoryPurchaseRoutes from "./routes/inventoryPurchaseRoutes.js";
import reservationRoutes from "./routes/reservationRoutes.js";
import lorryReceiptRoutes from "./routes/lorryReceiptRoutes.js";
import goodsReceiptRoutes from "./routes/goodsReceiptRoutes.js";
import loadingSlipRoutes from "./routes/loadingSlipRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import ledgerRoutes from "./routes/ledgerRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import overviewRoutes from "./routes/overviewRoutes.js";
import auditRoutes from "./routes/auditRoutes.js";
import { ROLES } from "./config/roles.js";

const app = express();

const corsOrigin =
  process.env.NODE_ENV === "production" ? process.env.CLIENT_URL : true; // reflect request origin in dev
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json());
app.use(morgan("dev"));

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/drivers", driverRoutes);
app.use("/api/clients", createPeopleRoutes(ROLES.CLIENT));
app.use("/api/employees", createPeopleRoutes(ROLES.EMPLOYEE));
app.use("/api/access", accessRoutes);
app.use("/api/maintenance", maintenanceRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/inventory-purchases", inventoryPurchaseRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/lorry-receipts", lorryReceiptRoutes);
app.use("/api/goods-receipts", goodsReceiptRoutes);
app.use("/api/loading-slips", loadingSlipRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/ledger", ledgerRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/overview", overviewRoutes);
app.use("/api/audit-logs", auditRoutes);

app.use((req, res) => res.status(404).json({ message: "Not found" }));

// Centralized error handler
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || "Server error" });
});

export default app;
