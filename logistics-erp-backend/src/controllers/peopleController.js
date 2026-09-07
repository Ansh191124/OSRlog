import User from "../models/User.js";
import { createUserWithPassword } from "./authController.js";
import { generateTempPassword } from "../utils/tempPassword.js";
import { ROLES } from "../config/roles.js";

// Factory: builds list/create/update handlers scoped to one fixed role
// (driver, client, or employee). Entry Master, Admin and Co-Admin create/update
// these records; employees start with no dashboard access (employeeCategory is
// assigned separately by Admin/Co-Admin via the Roles & Access page).
export function createPeopleController(role) {
  async function list(req, res) {
    const users = await User.find({ role }).sort({ createdAt: -1 });
    res.json({ [`${role}s`]: users.map((u) => u.toSafeJSON()) });
  }

  function applyRoleFields(user, body) {
    const { alternatePhone } = body;
    if (alternatePhone !== undefined) user.alternatePhone = alternatePhone;

    if (role === ROLES.DRIVER) {
      const {
        licenseNumber,
        licenseExpiry,
        licenseType,
        licensePhotoKey,
        docProofKey,
        dob,
        employmentType,
        driverType,
      } = body;
      if (licenseNumber !== undefined) user.licenseNumber = licenseNumber;
      if (licenseExpiry !== undefined) user.licenseExpiry = licenseExpiry || null;
      if (licenseType !== undefined) user.licenseType = licenseType;
      if (licensePhotoKey !== undefined) user.licensePhotoKey = licensePhotoKey;
      if (docProofKey !== undefined) user.docProofKey = docProofKey;
      if (dob !== undefined) user.dob = dob || null;
      if (employmentType !== undefined) user.employmentType = employmentType === "temporary" ? "temporary" : "permanent";
      if (driverType !== undefined) user.driverType = driverType === "independent" ? "independent" : "company";
    }

    if (role === ROLES.CLIENT) {
      const { companyName, address, gstin, businessType } = body;
      if (companyName !== undefined) user.companyName = companyName;
      if (address !== undefined) user.address = address;
      if (gstin !== undefined) user.gstin = gstin;
      if (businessType !== undefined) user.businessType = businessType;
    }

    if (role === ROLES.EMPLOYEE) {
      const { address, guardianName, aadharNumber, docProofKey } = body;
      if (address !== undefined) user.address = address;
      if (guardianName !== undefined) user.guardianName = guardianName;
      if (aadharNumber !== undefined) user.aadharNumber = aadharNumber;
      if (docProofKey !== undefined) user.docProofKey = docProofKey;
    }
  }

  async function create(req, res) {
    const { name, email, phone } = req.body;
    if (!name || !email) {
      return res.status(400).json({ message: "name and email are required" });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ message: "A user with this email already exists" });
    }

    const tempPassword = generateTempPassword();
    const fields = { name, email, phone, role };
    const user = await createUserWithPassword(fields, tempPassword);
    applyRoleFields(user, req.body);
    await user.save();
    res.status(201).json({ user: user.toSafeJSON(), tempPassword });
  }

  async function update(req, res) {
    const { id } = req.params;
    const user = await User.findOne({ _id: id, role });
    if (!user) return res.status(404).json({ message: `${role} not found` });

    const { name, phone, isActive } = req.body;
    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (isActive !== undefined) user.isActive = isActive;
    applyRoleFields(user, req.body);

    await user.save();
    res.json({ user: user.toSafeJSON() });
  }

  return { list, create, update };
}
