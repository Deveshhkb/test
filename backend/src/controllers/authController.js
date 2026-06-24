import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { asyncHandler } from '../middleware/error.js';

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const sanitize = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  mobile: user.mobile,
  role: user.role,
  avatar: user.avatar,
  preferredLanguage: user.preferredLanguage,
});

// @route POST /api/auth/register
export const register = asyncHandler(async (req, res) => {
  const { name, email, mobile, password } = req.body;
  const exists = await User.findOne({ email });
  if (exists) {
    res.status(400);
    throw new Error('An account with this email already exists');
  }
  const user = await User.create({ name, email, mobile, password });
  res.status(201).json({ success: true, token: signToken(user._id), user: sanitize(user) });
});

// @route POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error('Invalid email or password');
  }
  res.json({ success: true, token: signToken(user._id), user: sanitize(user) });
});

// @route POST /api/auth/otp/request  — issues a one-time code (demo: returned in response)
export const requestOtp = asyncHandler(async (req, res) => {
  const { mobile } = req.body;
  const user = await User.findOne({ mobile });
  if (!user) {
    res.status(404);
    throw new Error('No account found for this mobile number');
  }
  const code = String(Math.floor(100000 + Math.random() * 900000));
  user.otp = { code, expiresAt: new Date(Date.now() + 5 * 60 * 1000) };
  await user.save();
  // In production this would be sent over SMS, not returned in the response.
  res.json({ success: true, message: 'OTP sent', devOtp: process.env.NODE_ENV === 'production' ? undefined : code });
});

// @route POST /api/auth/otp/verify
export const verifyOtp = asyncHandler(async (req, res) => {
  const { mobile, code } = req.body;
  const user = await User.findOne({ mobile });
  if (!user || !user.otp || user.otp.code !== code || user.otp.expiresAt < new Date()) {
    res.status(400);
    throw new Error('Invalid or expired OTP');
  }
  user.otp = undefined;
  user.isVerified = true;
  await user.save();
  res.json({ success: true, token: signToken(user._id), user: sanitize(user) });
});

// @route GET /api/auth/me
export const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, user: sanitize(req.user) });
});

// @route PUT /api/auth/me
export const updateMe = asyncHandler(async (req, res) => {
  const fields = ['name', 'mobile', 'avatar', 'preferredLanguage'];
  fields.forEach((f) => {
    if (req.body[f] !== undefined) req.user[f] = req.body[f];
  });
  await req.user.save();
  res.json({ success: true, user: sanitize(req.user) });
});

// @route POST /api/auth/forgot-password (demo stub)
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  // Always respond success to avoid leaking which emails exist.
  res.json({
    success: true,
    message: 'If an account exists, a reset link has been sent.',
    ...(user && process.env.NODE_ENV !== 'production' ? { devNote: 'User found — wire up email service here.' } : {}),
  });
});
