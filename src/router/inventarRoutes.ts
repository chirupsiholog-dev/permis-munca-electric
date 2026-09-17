import { Router } from "express";
import { uploadInventar, getMyInventare, getSubordinatesInventare, getAllInventare, editInventar, deleteInventar, downloadInventar } from "../controllers/inventarController.js";
import { getCurrentUser } from "../middleware/getCurrentUser.js";
import { requireAdmin, requireSuperuser } from "../middleware/requireAdmin.js";
import { uploadImage } from "../middleware/uploadImage.js";

const router = Router();

router.post('/', getCurrentUser, uploadImage.array('imagini'), uploadInventar)
router.get('/my-inventare', getCurrentUser, getMyInventare)
router.get('/subordinates', getCurrentUser, requireAdmin, getSubordinatesInventare)
router.get('/all-inventare', getCurrentUser, requireSuperuser, getAllInventare)
router.put('/:id', getCurrentUser, editInventar)
router.delete('/:id', getCurrentUser, deleteInventar)
router.get('/download/:id', getCurrentUser, requireAdmin, downloadInventar)

export default router;