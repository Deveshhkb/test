import CmsPage from '../models/CmsPage.js';
import { asyncHandler, ApiError } from '../utils/asyncHandler.js';

// GET /api/cms
export const listPages = asyncHandler(async (req, res) => {
  const filter = req.user?.role === 'admin' ? {} : { isPublished: true };
  const pages = await CmsPage.find(filter).select('title slug isPublished updatedAt');
  res.json({ success: true, pages });
});

// GET /api/cms/:slug
export const getPage = asyncHandler(async (req, res) => {
  const page = await CmsPage.findOne({ slug: req.params.slug });
  if (!page) throw new ApiError(404, 'Page not found.');
  res.json({ success: true, page });
});

export const upsertPage = asyncHandler(async (req, res) => {
  const { slug } = req.body;
  const page = await CmsPage.findOneAndUpdate({ slug }, req.body, {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true,
  });
  res.json({ success: true, page });
});

export const deletePage = asyncHandler(async (req, res) => {
  const page = await CmsPage.findByIdAndDelete(req.params.id);
  if (!page) throw new ApiError(404, 'Page not found.');
  res.json({ success: true, message: 'Page deleted.' });
});
