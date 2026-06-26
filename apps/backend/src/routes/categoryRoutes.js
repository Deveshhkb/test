import { Router } from 'express';
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listBrands,
  createBrand,
  updateBrand,
  deleteBrand,
} from '../controllers/categoryController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

// Categories
router.get('/categories', listCategories);
router.post('/categories', protect, authorize('admin'), createCategory);
router.put('/categories/:id', protect, authorize('admin'), updateCategory);
router.delete('/categories/:id', protect, authorize('admin'), deleteCategory);

// Brands
router.get('/brands', listBrands);
router.post('/brands', protect, authorize('admin'), createBrand);
router.put('/brands/:id', protect, authorize('admin'), updateBrand);
router.delete('/brands/:id', protect, authorize('admin'), deleteBrand);

export default router;
