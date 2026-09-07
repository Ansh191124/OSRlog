import mongoose from "mongoose";

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri || uri.includes("<username>")) {
    console.warn(
      "[db] MONGODB_URI is not set to a real connection string yet. " +
        "Set it in backend/.env — the API will start but database calls will fail until then."
    );
    return;
  }

  try {
    await mongoose.connect(uri);
    console.log("[db] Connected to MongoDB");
  } catch (err) {
    console.error("[db] Failed to connect to MongoDB:", err.message);
  }
}
