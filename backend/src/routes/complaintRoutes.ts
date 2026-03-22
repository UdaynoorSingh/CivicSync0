import { Router } from "express";
import multer from "multer";
import { authGuard } from "../middleware/authGuard";
import { roleGuard } from "../middleware/roleGuard";
import {
  submitComplaint,
  getMyComplaints,
  getComplaintByRef,
  getHeatmap,
  getDistrictComplaints,
} from "../controllers/complaintController";

// Use memory storage so controller can upload file buffers directly to Cloudinary.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed."));
  },
});

const router = Router();

// Public - no auth required (heatmap is public data)
router.get("/heatmap", getHeatmap);

// All remaining complaint routes require authentication
router.use(authGuard);

// Get complaints by district (requires auth, but any citizen can check duplicates)
router.get(
  "/district/:districtName",
  roleGuard("citizen"),
  getDistrictComplaints,
);

// Submit a new complaint (citizens only) — multipart/form-data with optional `photo`
router.post("/", roleGuard("citizen"), upload.single("photo"), submitComplaint);

// Get all complaints filed by the current citizen
router.get("/my", roleGuard("citizen"), getMyComplaints);

// Get a specific complaint by reference number (citizen: own only; admin: any)
router.get("/:refNumber", getComplaintByRef);

export default router;
