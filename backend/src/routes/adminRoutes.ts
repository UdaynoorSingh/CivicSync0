import { Router } from "express";
import { authGuard } from "../middleware/authGuard";
import { roleGuard } from "../middleware/roleGuard";
import {
  getAdminComplaints,
  getAdminStats,
  updateComplaintStatus,
  escalateComplaintPriority,
  getAdminServiceRequests,
  updateServiceRequestStatus,
  getAdminBillMeta,
  createAdminBill,
  getAdminBills,
} from "../controllers/adminController";

const router = Router();

router.use(authGuard, roleGuard("admin", "superadmin"));

router.get("/stats", getAdminStats);

router.get("/complaints", getAdminComplaints);
router.patch("/complaints/:id/status", updateComplaintStatus);
router.patch("/complaints/:id/priority", escalateComplaintPriority);

router.get("/service-requests", getAdminServiceRequests);
router.patch("/service-requests/:id/status", updateServiceRequestStatus);

router.get("/bills/meta", getAdminBillMeta);
router.get("/bills", getAdminBills);
router.post("/bills", createAdminBill);

export default router;
