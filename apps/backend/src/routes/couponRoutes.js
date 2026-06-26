import { Router } from 'express';
import {
  listCoupons,
  validateCoupon,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} from '../controllers/couponController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.post('/validate', validateCoupon);
router.get('/', protect, authorize('admin'), listCoupons);
router.post('/', protect, authorize('admin'), createCoupon);
router.put('/:id', protect, authorize('admin'), updateCoupon);
router.delete('/:id', protect, authorize('admin'), deleteCoupon);

export default router;
