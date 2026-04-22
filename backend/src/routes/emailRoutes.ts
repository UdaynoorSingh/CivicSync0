import { Router } from "express";
import { authGuard } from "../middleware/authGuard";
import { roleGuard } from "../middleware/roleGuard";
import multer from "multer";
import {
  sendPaymentReceiptByEmail,
  sendComplaintPDFByEmail,
  sendServiceRequestPDFByEmail,
  sendCustomPDFByEmail,
} from "../controllers/emailController";

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

router.use(authGuard, roleGuard("citizen"));

router.post("/payment-receipt", sendPaymentReceiptByEmail);
router.post("/complaint-pdf", sendComplaintPDFByEmail);
router.post("/service-request-pdf", sendServiceRequestPDFByEmail);
router.post("/custom-pdf", upload.single("pdf"), sendCustomPDFByEmail);

export default router;