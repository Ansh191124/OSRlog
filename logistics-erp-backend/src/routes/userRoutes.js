const express = require("express");
const router = express.Router();
const { getUsers, createUser, updateUser } = require("../controllers/userController");
const { protect, authorize } = require("../middlewares/auth");

router.get("/", protect, authorize("admin"), getUsers);
router.post("/", protect, authorize("admin"), createUser);
router.put("/:id", protect, authorize("admin"), updateUser);

module.exports = router;
