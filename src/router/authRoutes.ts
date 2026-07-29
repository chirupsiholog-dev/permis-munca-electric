import { Router } from "express";
import { login, logout } from '../controllers/authController.js';
import {getCurrentUser} from '../middleware/getCurrentUser.js'


const router = Router();

router.post('/login', login)
router.post('/logout', getCurrentUser, logout);

export default router;