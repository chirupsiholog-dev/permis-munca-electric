import { Router } from "express";
import { webhookHandler, downloadEnvelope } from "../controllers/namirialController.js";
import { getCurrentUser } from "../middleware/getCurrentUser.js";

const router = Router();

router.post('/webhook/:secret', webhookHandler);
router.get('/webhook/:secret', webhookHandler);
router.get('/envelope/:id/download', getCurrentUser, downloadEnvelope)

export default router;