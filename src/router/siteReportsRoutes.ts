import { Router } from "express";
import { getAdminReports, getReports, uploadReport, editReport, downloadReports} from "../controllers/siteReportsController.js";
import { getCurrentUser } from "../middleware/getCurrentUser.js";
import { requireAdmin } from "../middleware/requireAdmin.js";

const router = Router();

router.post('/', getCurrentUser, uploadReport);
router.get('/admin', getCurrentUser, requireAdmin, getAdminReports);
router.get('/', getCurrentUser, getReports);
router.put('/:id', getCurrentUser, editReport);
router.get('/admin/download', getCurrentUser, requireAdmin, downloadReports);

export default router;