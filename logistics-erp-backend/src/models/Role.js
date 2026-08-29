const mongoose = require("mongoose");
const { PERMISSIONS } = require("../config/accessControl");

const roleSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^[a-z][a-z0-9_]*$/ },
    name: { type: String, required: true, trim: true },
    permissions: [{ type: String, enum: PERMISSIONS }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Role", roleSchema);
