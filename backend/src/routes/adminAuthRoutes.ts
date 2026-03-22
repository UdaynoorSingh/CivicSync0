import { Router } from "express";
import {
  adminLogin,
  adminGetMe,
  adminLogout,
} from "../controllers/adminAuthController";
import { authGuard } from "../middleware/authGuard";
import { roleGuard } from "../middleware/roleGuard";

const router = Router();

// Public
router.post("/login", adminLogin);

// Protected — admin or superadmin only
router.get("/me", authGuard, roleGuard("admin", "superadmin"), adminGetMe);
router.post(
  "/logout",
  authGuard,
  roleGuard("admin", "superadmin"),
  adminLogout,
);

export default router;
