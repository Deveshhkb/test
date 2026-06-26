import { Router } from 'express';
import {
  createOrder,
  verifyPayment,
  myOrders,
  getOrder,
  cancelOrder,
  listAllOrders,
  updateOrderStatus,
} from '../controllers/orderController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();
router.use(protect);

router.get('/', myOrders);
router.post('/', createOrder);
router.post('/verify', verifyPayment);
router.get('/admin/all', authorize('admin'), listAllOrders);
router.get('/:id', getOrder);
router.put('/:id/cancel', cancelOrder);
router.put('/:id/status', authorize('admin'), updateOrderStatus);

export default router;
