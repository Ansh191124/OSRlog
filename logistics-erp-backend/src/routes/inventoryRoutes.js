const express = require("express");
const router = express.Router();
const { getInventory, addInventory } = require("../controllers/inventoryController");
const { protect, requirePermission } = require("../middlewares/auth");

router.use(protect, requirePermission("inventory"));
router.get("/", getInventory);
router.post("/", addInventory);
module.exports = router;
