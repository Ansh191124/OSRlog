import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { ROLES, EMPLOYEE_CATEGORIES } from "../config/roles.js";

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: Object.values(ROLES),
      required: true,
    },
    // Only meaningful when role === 'employee'
    employeeCategory: {
      type: String,
      enum: Object.values(EMPLOYEE_CATEGORIES),
      default: null,
    },
    // Category IV: temporary employee granted Admin or Co-Admin scope for a limited time
    isTemporary: { type: Boolean, default: false },
    temporaryScope: {
      type: String,
      enum: [ROLES.ADMIN, ROLES.CO_ADMIN, null],
      default: null,
    },
    isActive: { type: Boolean, default: true },
    alternatePhone: { type: String, trim: true }, // drivers, clients, employees

    // --- Driver fields ---
    licenseNumber: { type: String, trim: true },
    licenseExpiry: { type: Date },
    licenseType: { type: String, trim: true }, // e.g. "LMV", "HMV"
    licensePhotoKey: { type: String, default: null }, // S3 key via /api/uploads/proof
    docProofKey: { type: String, default: null }, // generic proof document, S3 key
    dob: { type: Date },
    // Driver's employment status ("Type of Status Temporary or permanant" per the doc)
    employmentType: { type: String, enum: ["permanent", "temporary"], default: "permanent" },
    // "Driver Type": company-employed vs an independent/one-time driver
    driverType: { type: String, enum: ["company", "independent"], default: "company" },

    // --- Client fields ---
    companyName: { type: String, trim: true },
    address: { type: String, trim: true },
    gstin: { type: String, trim: true, uppercase: true }, // clients (optional)
    businessType: { type: String, trim: true }, // clients

    // --- Employee fields ---
    guardianName: { type: String, trim: true },
    aadharNumber: { type: String, trim: true },
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.passwordHash);
};

userSchema.methods.toSafeJSON = function toSafeJSON() {
  const obj = this.toObject();
  delete obj.passwordHash;
  return obj;
};

// The permission scope this user should be checked against.
userSchema.methods.effectiveScope = function effectiveScope() {
  if (this.isTemporary && this.temporaryScope) return this.temporaryScope;
  if (this.role === ROLES.EMPLOYEE) return this.employeeCategory;
  return this.role;
};

export default mongoose.model("User", userSchema);
