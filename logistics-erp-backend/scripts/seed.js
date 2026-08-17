require("dotenv").config();
const connectDB = require("../src/config/db");
const { User, Driver, Vehicle } = require("../src/models");
const mongoose = require("mongoose");

const run = async () => {
  try {
    await connectDB();

    // ---------- Admin user ----------
    const adminEmail = (process.env.ADMIN_EMAIL || "admin@logistics.com").toLowerCase();
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (!existingAdmin) {
      await User.create({
        name: process.env.ADMIN_NAME || "Admin",
        email: adminEmail,
        password: process.env.ADMIN_PASSWORD || "Admin@123",
        role: "admin",
      });
      console.log(`✅ Admin user created -> email: ${adminEmail} / password: ${process.env.ADMIN_PASSWORD || "Admin@123"}`);
    } else {
      console.log("ℹ️  Admin user already exists, skipping.");
    }

    // ---------- Employee user ----------
    const employeeEmail = (process.env.EMPLOYEE_EMAIL || "employee@logistics.com").toLowerCase();
    const existingEmployee = await User.findOne({ email: employeeEmail });

    if (!existingEmployee) {
      await User.create({
        name: process.env.EMPLOYEE_NAME || "Employee",
        email: employeeEmail,
        password: process.env.EMPLOYEE_PASSWORD || "Employee@123",
        role: "employee",
      });
      console.log(`✅ Employee user created -> email: ${employeeEmail} / password: ${process.env.EMPLOYEE_PASSWORD || "Employee@123"}`);
    } else {
      console.log("ℹ️  Employee user already exists, skipping.");
    }

    // ---------- Sample vehicle & driver (safe to remove) ----------
    let vehicle = await Vehicle.findOne({ vehicleNo: "UP32QN3385" });
    if (!vehicle) {
      vehicle = await Vehicle.create({
        vehicleNo: "UP32QN3385",
        vehicleType: "Truck",
        modelName: "Tata 3118",
        status: "active",
      });
    }

    const existingDriver = await Driver.findOne({ name: "Prem", phone: "9999999999" });
    if (!existingDriver) {
      await Driver.create({
        name: "Prem",
        phone: "9999999999",
        status: "active",
        assignedVehicle: vehicle._id,
      });
    }

    console.log("✅ Sample vehicle + driver ensured (UP32QN3385 / Prem).");
    console.log("🎉 Seeding complete.");
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  }
};

run();
