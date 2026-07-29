import { Router } from "express";
import { login, logout, signup } from '../controllers/authController.js';
import {getCurrentUser} from '../middleware/getCurrentUser.js'


const router = Router();

router.post('/login', login)
router.post('/logout', getCurrentUser, logout);
router.post('/signup', signup);

export default router;