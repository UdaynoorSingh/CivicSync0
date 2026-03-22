import { Router } from "express";
import { authGuard } from "../middleware/authGuard";
import { roleGuard } from "../middleware/roleGuard";
import { getBillById, getMyBills } from "../controllers/billController";

const router = Router();

router.use(authGuard, roleGuard("citizen"));

router.get("/my", getMyBills);
router.get("/:id", getBillById);

export default router;
