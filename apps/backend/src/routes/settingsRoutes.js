import { Router } from 'express';
import { getPublicSettings, getAdminSettings, updateSettings } from '../controllers/settingsController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/', getPublicSettings);
router.get('/admin', protect, authorize('admin'), getAdminSettings);
router.put('/admin', protect, authorize('admin'), updateSettings);

export default router;
