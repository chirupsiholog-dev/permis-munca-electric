import { Router } from "express";
import { webhookHandler } from "../controllers/namirialController.js";

const router = Router();

router.post('/webhook', webhookHandler);
router.get('/webhook', webhookHandler);

export default router;