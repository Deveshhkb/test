import { Router } from 'express';
import {
  register,
  login,
  logout,
  getMe,
  updateMe,
  forgotPassword,
  resetPassword,
  sendOtp,
  verifyOtp,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);

export default router;
