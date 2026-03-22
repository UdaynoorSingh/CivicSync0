import { Router } from "express";
import multer from "multer";
import { authGuard } from "../middleware/authGuard";
import { roleGuard } from "../middleware/roleGuard";
import {
  submitServiceRequest,
  getMyServiceRequests,
  getServiceRequestById,
} from "../controllers/serviceRequestController";

// Use memory storage so controller can upload file buffers directly to Cloudinary.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB per file
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else
      cb(new Error("Only images (JPEG/PNG/WebP) and PDF files are allowed."));
  },
});

const router = Router();

router.use(authGuard);

// Submit a new service request (citizens only)
// Accepts up to 2 documents: "id_proof" and "address_proof"
router.post(
  "/",
  roleGuard("citizen"),
  upload.fields([
    { name: "id_proof", maxCount: 1 },
    { name: "address_proof", maxCount: 1 },
  ]),
  submitServiceRequest,
);

// Citizen's own service requests
router.get("/my", roleGuard("citizen"), getMyServiceRequests);

// Single request by ID
router.get("/:id", getServiceRequestById);

export default router;
