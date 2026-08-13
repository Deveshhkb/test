import crypto from 'crypto';
import User from '../models/User.js';
import { asyncHandler, ApiError } from '../utils/asyncHandler.js';
import { sendAuthToken, authCookieOptions } from '../utils/token.js';

// POST /api/auth/register
export const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password) throw new ApiError(400, 'Name, email and password are required.');

  const exists = await User.findOne({ email });
  if (exists) throw new ApiError(409, 'An account with this email already exists.');

  const user = await User.create({ name, email, password, phone });
  sendAuthToken(res, user, 201);
});

// POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new ApiError(400, 'Email and password are required.');

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    throw new ApiError(401, 'Invalid email or password.');
  }
  sendAuthToken(res, user);
});

// POST /api/auth/logout
export const logout = asyncHandler(async (req, res) => {
  // Flags must match those used when setting the cookie, or the browser
  // keeps it and the user stays logged in.
  const { maxAge, ...flags } = authCookieOptions(req);
  res.clearCookie('token', flags);
  res.json({ success: true, message: 'Logged out.' });
});

// GET /api/auth/me
export const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user });
});

// PUT /api/auth/me
export const updateMe = asyncHandler(async (req, res) => {
  const { name, phone, avatar } = req.body;
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { name, phone, avatar } },
    { new: true, runValidators: true }
  );
  res.json({ success: true, user });
});

// POST /api/auth/forgot-password
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  // Always respond success to avoid leaking which emails exist.
  if (!user) return res.json({ success: true, message: 'If the email exists, a reset link was sent.' });

  const resetToken = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.resetPasswordExpires = Date.now() + 30 * 60 * 1000; // 30 min
  await user.save({ validateBeforeSave: false });

  // In production, email this link. For dev we return it directly.
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  res.json({
    success: true,
    message: 'Password reset token generated.',
    ...(process.env.NODE_ENV !== 'production' && { resetUrl }),
  });
});

// POST /api/auth/reset-password
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) throw new ApiError(400, 'Token and new password are required.');

  const hashed = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    resetPasswordToken: hashed,
    resetPasswordExpires: { $gt: Date.now() },
  }).select('+resetPasswordToken +resetPasswordExpires');

  if (!user) throw new ApiError(400, 'Invalid or expired reset token.');

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();
  sendAuthToken(res, user);
});

// POST /api/auth/send-otp
export const sendOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, 'No account found for this email.');

  const otp = ('' + Math.floor(100000 + Math.random() * 900000));
  user.otpCode = crypto.createHash('sha256').update(otp).digest('hex');
  user.otpExpires = Date.now() + 10 * 60 * 1000;
  await user.save({ validateBeforeSave: false });

  // Integrate SMS/email provider here. Dev returns the OTP for testing.
  res.json({
    success: true,
    message: 'OTP sent.',
    ...(process.env.NODE_ENV !== 'production' && { otp }),
  });
});

// POST /api/auth/verify-otp
export const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  const user = await User.findOne({ email }).select('+otpCode +otpExpires');
  if (!user) throw new ApiError(404, 'No account found.');

  const hashed = crypto.createHash('sha256').update(String(otp)).digest('hex');
  if (user.otpCode !== hashed || user.otpExpires < Date.now()) {
    throw new ApiError(400, 'Invalid or expired OTP.');
  }
  user.emailVerified = true;
  user.otpCode = undefined;
  user.otpExpires = undefined;
  await user.save({ validateBeforeSave: false });
  sendAuthToken(res, user);
});
