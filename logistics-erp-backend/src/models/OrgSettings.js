const mongoose = require("mongoose");
const { Schema } = mongoose;

// Singleton document describing the organization's fleet numbering pool, e.g.
// FL-1001 .. FL-2000. Clients reserve a contiguous slice of this pool; admins
// can widen the pool as the fleet grows.
const orgSettingsSchema = new Schema(
  {
    key: { type: String, default: "default", unique: true },
    fleetPrefix: { type: String, default: "FL", trim: true },
    fleetRangeStart: { type: Number, default: 1001 },
    fleetRangeEnd: { type: Number, default: 2000 },
  },
  { timestamps: true }
);

orgSettingsSchema.statics.getSingleton = async function () {
  let doc = await this.findOne({ key: "default" });
  if (!doc) doc = await this.create({ key: "default" });
  return doc;
};

module.exports = mongoose.model("OrgSettings", orgSettingsSchema);
