import Router from 'express'
import { getCurrentUser } from '../middleware/getCurrentUser.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { postAutorizatie } from '../controllers/autorizatieController.js'

const router = Router()

router.post('/new', getCurrentUser, requireAdmin, postAutorizatie)

export default router