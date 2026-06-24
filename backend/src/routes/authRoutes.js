import express from 'express';
import {
  register,
  login,
  requestOtp,
  verifyOtp,
  getMe,
  updateMe,
  forgotPassword,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/otp/request', requestOtp);
router.post('/otp/verify', verifyOtp);
router.post('/forgot-password', forgotPassword);
router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);

export default router;
