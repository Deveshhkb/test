import { Router } from 'express';
import {
  getProductReviews,
  createReview,
  deleteReview,
  moderateReview,
} from '../controllers/reviewController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/product/:productId', getProductReviews);
router.post('/', protect, createReview);
router.delete('/:id', protect, deleteReview);
router.put('/:id/moderate', protect, authorize('admin'), moderateReview);

export default router;
