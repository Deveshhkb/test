import { Router } from 'express';
import {
  getProductReviews,
  listAllReviews,
  createReview,
  toggleHelpful,
  deleteReview,
  moderateReview,
} from '../controllers/reviewController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/product/:productId', getProductReviews);
router.get('/admin/all', protect, authorize('admin'), listAllReviews);
router.post('/', protect, createReview);
router.post('/:id/helpful', protect, toggleHelpful);
router.delete('/:id', protect, deleteReview);
router.put('/:id/moderate', protect, authorize('admin'), moderateReview);

export default router;
