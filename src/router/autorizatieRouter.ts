import Router from 'express'
import { getCurrentUser } from '../middleware/getCurrentUser.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { createPdfWithImages, getAllAutorizatii, postAutorizatie } from '../controllers/autorizatieController.js'
import { uploadImage } from '../middleware/uploadImage.js'

const router = Router()

router.post('/new', getCurrentUser, requireAdmin, postAutorizatie);
router.post('/pdf-with-images', requireAdmin, uploadImage.single('image'), createPdfWithImages);
router.get('/all', getCurrentUser, requireAdmin, getAllAutorizatii);

export default router