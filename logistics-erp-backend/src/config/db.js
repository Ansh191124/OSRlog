const mongoose = require("mongoose");
require("dotenv").config();

/**
 * Works for BOTH:
 *  - local MongoDB (mongodb://localhost:27017/logistics_erp)
 *  - MongoDB Atlas / any remote Mongo (mongodb+srv://...)
 * Just change MONGO_URI in .env - no code changes needed.
 */
const connectDB = async () => {
  mongoose.set("strictQuery", true);

  const conn = await mongoose.connect(process.env.MONGO_URI, {
    // Modern mongoose (6+/7+/8+) no longer needs useNewUrlParser/useUnifiedTopology,
    // they're the default. Left here as a comment for older driver versions.
  });

  console.log(`✅ MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  return conn;
};

module.exports = connectDB;
