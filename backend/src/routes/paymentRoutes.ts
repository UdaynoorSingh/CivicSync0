import { Router } from "express";
import { authGuard } from "../middleware/authGuard";
import { roleGuard } from "../middleware/roleGuard";
import {
  createPaymentOrder,
  getMyPayments,
  getPaymentById,
  downloadPaymentReceipt,
  sendPaymentReceiptEmail,
  getRazorpayKey,
  markPaymentFailed,
  verifyBillPayment,
  verifyPayment,
} from "../controllers/paymentController";

const router = Router();

router.use(authGuard, roleGuard("citizen"));

router.get("/key", getRazorpayKey);
router.post("/orders", createPaymentOrder);
router.post("/verify-payment", verifyBillPayment);
router.post("/verify", verifyPayment);
router.post("/failure", markPaymentFailed);
router.get("/my", getMyPayments);
router.get("/:id/receipt", downloadPaymentReceipt);
router.post("/:id/receipt/email", sendPaymentReceiptEmail);
router.get("/:id", getPaymentById);

export default router;
