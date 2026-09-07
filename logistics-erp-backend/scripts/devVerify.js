import { MongoMemoryServer } from "mongodb-memory-server";
import http from "http";

// Isolated, disposable verification server: an in-memory MongoDB seeded with
// one user per role, booting the real app — never touches backend/.env or
// any real database. Run, click through, then Ctrl+C; nothing persists.
process.env.JWT_SECRET = "dev-verify-secret";
process.env.JWT_EXPIRES_IN = "1d";
process.env.NODE_ENV = "development";
process.env.PORT = process.env.PORT || "8000";

async function main() {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();

  const { connectDB } = await import("../src/config/db.js");
  await connectDB();

  const { default: app } = await import("../src/app.js");
  const { initSocket } = await import("../src/utils/socket.js");
  const { createUserWithPassword } = await import("../src/controllers/authController.js");
  const { ROLES, EMPLOYEE_CATEGORIES } = await import("../src/config/roles.js");

  const password = "password123";
  const users = {
    admin: await createUserWithPassword({ name: "Admin", email: "admin@test.com", role: ROLES.ADMIN }, password),
    coAdmin: await createUserWithPassword({ name: "Co Admin", email: "coadmin@test.com", role: ROLES.CO_ADMIN }, password),
    entryMaster: await createUserWithPassword(
      { name: "Entry Master", email: "entrymaster@test.com", role: ROLES.EMPLOYEE, employeeCategory: EMPLOYEE_CATEGORIES.ENTRY_MASTER },
      password
    ),
    vehicleMaster: await createUserWithPassword(
      { name: "Vehicle Master", email: "vehiclemaster@test.com", role: ROLES.EMPLOYEE, employeeCategory: EMPLOYEE_CATEGORIES.VEHICLE_MASTER },
      password
    ),
    accountant: await createUserWithPassword(
      { name: "Accountant", email: "accountant@test.com", role: ROLES.EMPLOYEE, employeeCategory: EMPLOYEE_CATEGORIES.ACCOUNTANT },
      password
    ),
    client: await createUserWithPassword(
      { name: "Client One", email: "client@test.com", role: ROLES.CLIENT, companyName: "Client Co" },
      password
    ),
    driver: await createUserWithPassword(
      { name: "Driver One", email: "driver@test.com", role: ROLES.DRIVER, licenseNumber: "DL123" },
      password
    ),
  };

  const httpServer = http.createServer(app);
  initSocket(httpServer);
  await new Promise((resolve) => httpServer.listen(process.env.PORT, resolve));
  console.log(`[devVerify] Server ready on port ${process.env.PORT}`);
  console.log(
    "[devVerify] Seeded users (password: password123):",
    Object.fromEntries(Object.entries(users).map(([k, u]) => [k, u.email]))
  );
}

main().catch((err) => {
  console.error("[devVerify] Failed:", err);
  process.exit(1);
});
