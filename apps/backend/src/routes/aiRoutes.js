import { Router } from 'express';
import {
  getConfig,
  chat,
  getAdminSettings,
  updateAdminSettings,
  listConversations,
} from '../controllers/aiController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

// Public (chat works for guests; personalization requires a valid cookie).
router.get('/config', getConfig);
router.post('/chat', chat);

// Admin
router.get('/admin/settings', protect, authorize('admin'), getAdminSettings);
router.put('/admin/settings', protect, authorize('admin'), updateAdminSettings);
router.get('/admin/conversations', protect, authorize('admin'), listConversations);

export default router;
