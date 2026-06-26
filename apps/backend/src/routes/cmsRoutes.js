import { Router } from 'express';
import { listPages, getPage, upsertPage, deletePage } from '../controllers/cmsController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/', listPages);
router.get('/:slug', getPage);
router.post('/', protect, authorize('admin'), upsertPage);
router.delete('/:id', protect, authorize('admin'), deletePage);

export default router;
