import express from 'express';
import {
  createBooking,
  myBookings,
  cancelBooking,
  allBookings,
  updateBooking,
} from '../controllers/bookingController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.post('/', protect, createBooking);
router.get('/mine', protect, myBookings);
router.put('/:id/cancel', protect, cancelBooking);

router.get('/', protect, adminOnly, allBookings);
router.put('/:id', protect, adminOnly, updateBooking);

export default router;
