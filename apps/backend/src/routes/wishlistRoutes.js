import { Router } from 'express';
import {
  getWishlist,
  toggleWishlist,
  removeFromWishlist,
} from '../controllers/wishlistController.js';
import { protect } from '../middleware/auth.js';

const router = Router();
router.use(protect);

router.get('/', getWishlist);
router.post('/', toggleWishlist);
router.delete('/:productId', removeFromWishlist);

export default router;
