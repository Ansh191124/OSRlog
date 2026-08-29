const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const path = require("path");
require("dotenv").config();

const { notFound, errorHandler } = require("./middlewares/errorHandler");

const authRoutes = require("./routes/authRoutes");
const driverRoutes = require("./routes/driverRoutes");
const vehicleRoutes = require("./routes/vehicleRoutes");
const tripRoutes = require("./routes/tripRoutes");
const maintenanceRoutes = require("./routes/maintenanceRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const userRoutes = require("./routes/userRoutes");
const roleRoutes = require("./routes/roleRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const approvalRequestRoutes = require("./routes/approvalRequestRoutes");
const fleetRoutes = require("./routes/fleetRoutes");

const app = express();

// ---------- Global middlewares ----------
app.use(helmet());
app.use(
  cors({
    origin: (process.env.CORS_ORIGIN || "*").split(",").map((o) => o.trim()),
    credentials: true,
  })
);
app.use(compression());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== "test") {
  app.use(morgan(process.env.NODE_ENV === "development" ? "dev" : "combined"));
}

// Serve locally-uploaded files when STORAGE_DRIVER=local
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// ---------- Server status / health checks ----------
const serverStatus = (req, res) => {
  res.json({
    success: true,
    status: "ok",
    message: "Logistics ERP API is running",
    time: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
  });
};

app.get("/health", serverStatus);

// ---------- API routes ----------
const API_PREFIX = process.env.API_PREFIX || "/api";
app.get(`${API_PREFIX}/status`, serverStatus);
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/roles`, roleRoutes);
app.use(`${API_PREFIX}/inventory`, inventoryRoutes);
app.use(`${API_PREFIX}/approvals`, approvalRequestRoutes);
app.use(`${API_PREFIX}/fleets`, fleetRoutes);
app.use(`${API_PREFIX}/drivers`, driverRoutes);
app.use(`${API_PREFIX}/vehicles`, vehicleRoutes);
app.use(`${API_PREFIX}/trips`, tripRoutes);
app.use(`${API_PREFIX}/maintenance`, maintenanceRoutes);
app.use(`${API_PREFIX}/payments`, paymentRoutes);
app.use(`${API_PREFIX}/dashboard`, dashboardRoutes);
// app.use(`${API_PREFIX}/CashBook`, cashBookRoutes);
// User Route Is missing 


// ---------- Error handling ----------
app.use(notFound);
app.use(errorHandler);

module.exports = app;
