import { Router } from "express";
import { webhookHandler } from "../controllers/namirialController.js";

const router = Router();

router.post('/webhook/:secret', webhookHandler);
router.get('/webhook/:secret', webhookHandler);

export default router;