import { Router } from "express";
import { getAllReports, getMyReports, uploadReport, editReport, downloadReports, deleteReport, getReportsSubordinates} from "../controllers/siteReportsController.js";
import { getCurrentUser } from "../middleware/getCurrentUser.js";
import { requireAdmin, requireSuperuser } from "../middleware/requireAdmin.js";

const router = Router();

router.post('/', getCurrentUser, uploadReport);
router.get('/all-reports', getCurrentUser, requireSuperuser, getAllReports);
router.get('/my-reports', getCurrentUser, getMyReports);
router.get('/subordinates', getCurrentUser, requireAdmin, getReportsSubordinates)
router.put('/:id', getCurrentUser, editReport);
router.get('/admin/download', getCurrentUser, requireAdmin, downloadReports);
router.delete('/:id', getCurrentUser, deleteReport);

export default router;