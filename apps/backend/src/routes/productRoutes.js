import { Router } from 'express';
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/productController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/', listProducts);
router.get('/:idOrSlug', getProduct);
router.post('/', protect, authorize('admin'), createProduct);
router.put('/:id', protect, authorize('admin'), updateProduct);
router.delete('/:id', protect, authorize('admin'), deleteProduct);

export default router;
