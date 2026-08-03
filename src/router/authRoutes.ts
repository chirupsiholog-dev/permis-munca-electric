import { Router } from "express";
import { login, logout, signup, me } from '../controllers/authController.js';
import {getCurrentUser} from '../middleware/getCurrentUser.js'


const router = Router();

router.post('/login', login)
router.post('/logout', getCurrentUser, logout);
router.post('/signup', signup);
router.get('/me', getCurrentUser, me);

export default router;