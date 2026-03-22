import { Router } from "express";
import { getHelpContacts } from "../controllers/helpController";

const router = Router();

router.get("/contacts", getHelpContacts);

export default router;
