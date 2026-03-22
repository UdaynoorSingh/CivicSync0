import { Router } from "express";
import {
  pushNotification,
  getNotifications,
  getAllNotificationsForAdmin,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
} from "../controllers/notificationController";
import { authGuard } from "../middleware/authGuard";
import { roleGuard } from "../middleware/roleGuard";

const router = Router();

router.use(authGuard);

// Citizen routes
router.get("/", getNotifications);
router.put("/read-all", markAllAsRead);
router.put("/:id/read", markAsRead);
router.delete("/delete-all", deleteAllNotifications);
router.delete("/:id", deleteNotification);

// Admin routes
router.post(
  "/push",
  roleGuard("admin", "superadmin", "head_admin"),
  pushNotification,
);
router.get(
  "/admin",
  roleGuard("admin", "superadmin", "head_admin"),
  getAllNotificationsForAdmin,
);

export default router;
