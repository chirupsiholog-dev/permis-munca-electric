import { Router } from "express";
import { webhookHandler, webhookHandlerAutorizatii} from "../controllers/namirialController.js";

const router = Router();

router.post('/webhook/:secret', webhookHandler);
router.get('/webhook/:secret', webhookHandler);

router.post('/webhook/autorizatii/:secret', webhookHandlerAutorizatii);
router.get('/webhook/autorizatii/:secret', webhookHandlerAutorizatii);

export default router;