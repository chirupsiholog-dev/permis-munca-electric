import { Router } from 'express';
import { getAllDocuments } from '../controllers/docController.js';
import { getDocumentOnId } from '../controllers/docController.js';
import { postDocument } from '../controllers/docController.js';
import { documentsStats } from '../controllers/docController.js';
import { getCurrentUser } from '../middleware/getCurrentUser.js';
import { downloadDocument } from '../controllers/docController.js';

const router = Router();

router.get('/all', getCurrentUser,  getAllDocuments);
router.post('/new', getCurrentUser, postDocument);
//needs to be before /:id endpoint, otherwise the route will check for an id in the request
router.get('/stats', getCurrentUser, documentsStats);
router.get('/:id/download', getCurrentUser, downloadDocument);
router.get('/:id', getCurrentUser, getDocumentOnId);


export default router;