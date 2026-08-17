import { Router } from "express";
import { getReports, uploadReport } from "../controllers/siteReportsController.js";
import { getCurrentUser } from "../middleware/getCurrentUser.js";
import { requireAdmin } from "../middleware/requireAdmin.js";

const router = Router();

router.post('/', getCurrentUser, uploadReport);
router.get('/', getCurrentUser, requireAdmin, getReports);

export default router;