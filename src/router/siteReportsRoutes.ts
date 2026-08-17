import { Router } from "express";
import { getAdminReports, getReports, uploadReport, editReport } from "../controllers/siteReportsController.js";
import { getCurrentUser } from "../middleware/getCurrentUser.js";
import { requireAdmin } from "../middleware/requireAdmin.js";

const router = Router();

router.post('/', getCurrentUser, uploadReport);
router.get('/admin', getCurrentUser, requireAdmin, getAdminReports);
router.get('/', getCurrentUser, getReports);
router.put('/:id', getCurrentUser, editReport);

export default router;