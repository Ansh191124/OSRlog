const express = require("express");
const router = express.Router();
const { register, login, me, changePassword } = require("../controllers/authController");
const { protect, authorize } = require("../middlewares/auth");

// Public
router.post("/login", login);

// First-ever admin registration is open; after that, only admins can register new users.
// The seed script (npm run seed) already creates the first admin, so in practice
// this route should be protected. It's left protectable via the authorize check below.
router.post("/register", protect, authorize("admin"), register);

// Public bootstrap route (only works if there are zero users) - handled in controller-level check optionally.
// For simplicity in this build, registration always requires an authenticated admin.
// Use `npm run seed` to create the very first admin account.

router.get("/me", protect, me);
router.put("/change-password", protect, changePassword);

module.exports = router;
