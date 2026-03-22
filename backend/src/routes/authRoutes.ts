import { Router } from "express";
import {
  sendOTP,
  verifyOTPHandler,
  firebaseLogin,
  getMe,
  logout,
  updateProfile,
  getDistricts,
} from "../controllers/authController";
import { authGuard } from "../middleware/authGuard";

const router = Router();

// Public routes
router.post("/send-otp", sendOTP);
router.post("/verify-otp", verifyOTPHandler);
router.post("/firebase-login", firebaseLogin);
router.get("/districts", getDistricts);

// Protected routes
router.get("/me", authGuard, getMe);
router.post("/logout", authGuard, logout);
router.patch("/profile", authGuard, updateProfile);

export default router;
