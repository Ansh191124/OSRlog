const mongoose = require("mongoose");
const { Schema } = mongoose;

// Singleton document for org-wide settings.
const orgSettingsSchema = new Schema(
  {
    key: { type: String, default: "default", unique: true },
    dieselRate: { type: Number, default: 0 },
  },
  { timestamps: true }
);

orgSettingsSchema.statics.getSingleton = async function () {
  let doc = await this.findOne({ key: "default" });
  if (!doc) doc = await this.create({ key: "default" });
  return doc;
};

module.exports = mongoose.model("OrgSettings", orgSettingsSchema);
