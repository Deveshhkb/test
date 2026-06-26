import Banner from '../models/Banner.js';
import { asyncHandler, ApiError } from '../utils/asyncHandler.js';

// GET /api/banners?placement=hero
export const listBanners = asyncHandler(async (req, res) => {
  const filter = { isActive: true };
  if (req.query.placement) filter.placement = req.query.placement;
  const banners = await Banner.find(filter).sort('order');
  res.json({ success: true, banners });
});

export const createBanner = asyncHandler(async (req, res) => {
  const banner = await Banner.create(req.body);
  res.status(201).json({ success: true, banner });
});

export const updateBanner = asyncHandler(async (req, res) => {
  const banner = await Banner.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!banner) throw new ApiError(404, 'Banner not found.');
  res.json({ success: true, banner });
});

export const deleteBanner = asyncHandler(async (req, res) => {
  const banner = await Banner.findByIdAndDelete(req.params.id);
  if (!banner) throw new ApiError(404, 'Banner not found.');
  res.json({ success: true, message: 'Banner deleted.' });
});
