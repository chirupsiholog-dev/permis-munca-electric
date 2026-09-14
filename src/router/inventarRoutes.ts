import { Router } from "express";
import { uploadInventar, getMyInventare, getSubordinatesInventare, getAllInventare, editInventar, deleteInventar } from "../controllers/inventarController.js";
import { getCurrentUser } from "../middleware/getCurrentUser.js";
import { requireAdmin, requireSuperuser } from "../middleware/requireAdmin.js";

const router = Router();

router.post('/new', getCurrentUser, uploadInventar)
router.get('/my-inventare', getCurrentUser, getMyInventare)
router.get('/subordinates', getCurrentUser, requireAdmin, getSubordinatesInventare)
router.get('/all-inventare', getCurrentUser, requireSuperuser, getAllInventare)
router.put('/:id', getCurrentUser, editInventar)
router.delete('/:id', getCurrentUser, deleteInventar)

export default router;