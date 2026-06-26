import { Router } from 'express';
import {
  listBanners,
  createBanner,
  updateBanner,
  deleteBanner,
} from '../controllers/bannerController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/', listBanners);
router.post('/', protect, authorize('admin'), createBanner);
router.put('/:id', protect, authorize('admin'), updateBanner);
router.delete('/:id', protect, authorize('admin'), deleteBanner);

export default router;
