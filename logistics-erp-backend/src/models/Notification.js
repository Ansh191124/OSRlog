import mongoose from "mongoose";

const { Schema } = mongoose;

const notificationSchema = new Schema(
  {
    recipient: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, trim: true },
    type: { type: String, trim: true, default: "general" },
    read: { type: Boolean, default: false },
    link: { type: String, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("Notification", notificationSchema);
