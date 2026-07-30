import { Router } from 'express';
import { getAllDocuments } from '../controllers/docController.js';
import { getDocumentOnId } from '../controllers/docController.js';
import { postDocument } from '../controllers/docController.js';
import { getCurrentUser } from '../middleware/getCurrentUser.js';

const router = Router();

router.get('/all', getCurrentUser,  getAllDocuments);
router.get('/:id', getCurrentUser, getDocumentOnId);
router.post('/new', getCurrentUser, postDocument);

export default router;