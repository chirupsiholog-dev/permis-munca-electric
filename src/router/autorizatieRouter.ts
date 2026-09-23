import Router from 'express'
import { getCurrentUser } from '../middleware/getCurrentUser.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { postAutorizatie, downloadSignedAutorizatie} from '../controllers/autorizatieController.js'

const router = Router()

router.post('/new', getCurrentUser, requireAdmin, postAutorizatie)
router.get('/download/:id', getCurrentUser, requireAdmin, downloadSignedAutorizatie)

export default router