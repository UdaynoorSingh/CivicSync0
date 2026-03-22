import { Router } from "express";
import { authGuard } from "../middleware/authGuard";
import { roleGuard } from "../middleware/roleGuard";
import {
  sendHeadAdminOTP,
  verifyHeadAdminOTP,
  headAdminFirebaseLogin,
  getHeadAdminMe,
  headAdminLogout,
  getHeadAdminMeta,
  createDepartmentAdmin,
  listDepartmentAdmins,
  removeDepartmentAdmin,
  getFeedbackDashboard,
} from "../controllers/headAdminController";

const router = Router();

router.post("/head-admin/send-otp", sendHeadAdminOTP);
router.post("/head-admin/verify-otp", verifyHeadAdminOTP);
router.post("/head-admin/firebase-login", headAdminFirebaseLogin);

router.use("/head-admin", authGuard, roleGuard("head_admin"));

router.get("/head-admin/me", getHeadAdminMe);
router.post("/head-admin/logout", headAdminLogout);
router.get("/head-admin/meta", getHeadAdminMeta);
router.get("/head-admin/department-admins", listDepartmentAdmins);
router.post("/head-admin/department-admins", createDepartmentAdmin);
router.delete("/head-admin/department-admins/:id", removeDepartmentAdmin);
router.get("/head-admin/feedbacks", getFeedbackDashboard);

export default router;
