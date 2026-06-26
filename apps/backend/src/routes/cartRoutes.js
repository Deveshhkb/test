import { Router } from 'express';
import {
  getCart,
  addToCart,
  updateItem,
  removeItem,
  applyCoupon,
  removeCoupon,
} from '../controllers/cartController.js';
import { protect } from '../middleware/auth.js';

const router = Router();
router.use(protect);

router.get('/', getCart);
router.post('/', addToCart);
router.put('/item/:itemId', updateItem);
router.delete('/item/:itemId', removeItem);
router.post('/coupon', applyCoupon);
router.delete('/coupon', removeCoupon);

export default router;
