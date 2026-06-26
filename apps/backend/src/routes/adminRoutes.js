import { Router } from 'express';
import { getDashboard, listCustomers } from '../controllers/adminController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();
router.use(protect, authorize('admin'));

router.get('/dashboard', getDashboard);
router.get('/customers', listCustomers);

export default router;
