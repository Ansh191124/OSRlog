const express = require("express");
const router = express.Router();
const { listRoles, createRole, updateRole, deleteRole } = require("../controllers/roleController");
const { protect, authorize } = require("../middlewares/auth");

router.use(protect, authorize("admin"));
router.get("/", listRoles);
router.post("/", createRole);
router.put("/:key", updateRole);
router.delete("/:key", deleteRole);

module.exports = router;
