import { Router } from 'express';
import { getAllDocuments } from '../controllers/docController.js';
import { getDocumentOnId } from '../controllers/docController.js';
import { postDocument } from '../controllers/docController.js';

const router = Router();

router.get('/all', getAllDocuments);
router.get('/:id', getDocumentOnId);
router.post('/new', postDocument);

export default router;