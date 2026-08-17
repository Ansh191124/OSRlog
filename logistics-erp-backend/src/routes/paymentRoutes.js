const express = require("express");
const router = express.Router();
const {
  getPayments,
  getPayment,
  createPayment,
  updatePayment,
  deletePayment,
  getPaymentSummary,
  uploadReceipt,
} = require("../controllers/paymentController");
const { protect, authorize } = require("../middlewares/auth");
const { upload, setUploadFolder } = require("../middlewares/upload");

router.use(protect);

router.get("/", getPayments);
router.get("/summary", getPaymentSummary);
router.get("/:id", getPayment);
router.post("/", createPayment);
router.put("/:id", updatePayment);
router.delete("/:id", authorize("admin"), deletePayment);

router.post("/:id/receipt", setUploadFolder("payments"), upload.single("file"), uploadReceipt);

module.exports = router;
