import Coupon from '../models/Coupon.js';
import { asyncHandler, ApiError } from '../utils/asyncHandler.js';

// GET /api/coupons  (admin) / public active list
export const listCoupons = asyncHandler(async (req, res) => {
  const filter = req.user?.role === 'admin' ? {} : { isActive: true };
  const coupons = await Coupon.find(filter).sort('-createdAt');
  res.json({ success: true, coupons });
});

// POST /api/coupons/validate  -> check a code against a subtotal
export const validateCoupon = asyncHandler(async (req, res) => {
  const { code, subtotal = 0 } = req.body;
  const coupon = await Coupon.findOne({ code: String(code).toUpperCase() });
  if (!coupon) throw new ApiError(404, 'Invalid coupon code.');
  const result = coupon.evaluate(Number(subtotal));
  res.json({ success: result.valid, ...result, code: coupon.code });
});

export const createCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.create(req.body);
  res.status(201).json({ success: true, coupon });
});

export const updateCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!coupon) throw new ApiError(404, 'Coupon not found.');
  res.json({ success: true, coupon });
});

export const deleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);
  if (!coupon) throw new ApiError(404, 'Coupon not found.');
  res.json({ success: true, message: 'Coupon deleted.' });
});
