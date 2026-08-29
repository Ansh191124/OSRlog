require("dotenv").config();
const app = require("./app");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`🚀 Logistics ERP API running on port ${PORT} [${process.env.NODE_ENV || "development"}]`);
      console.log("CORS Allow From" , process.env.CORS_ORIGIN)
    });
  } catch (err) {
    console.error("❌ Unable to start server:", err);
    process.exit(1);
  }
};

start();
