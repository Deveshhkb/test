import slugify from 'slugify';
import Category from '../models/Category.js';
import Brand from '../models/Brand.js';
import { asyncHandler, ApiError } from '../utils/asyncHandler.js';

// ---- Categories ----
export const listCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({ isActive: true }).sort('order name');
  res.json({ success: true, categories });
});

export const createCategory = asyncHandler(async (req, res) => {
  const body = { ...req.body };
  if (!body.slug && body.name) body.slug = slugify(body.name, { lower: true, strict: true });
  const category = await Category.create(body);
  res.status(201).json({ success: true, category });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!category) throw new ApiError(404, 'Category not found.');
  res.json({ success: true, category });
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) throw new ApiError(404, 'Category not found.');
  res.json({ success: true, message: 'Category deleted.' });
});

// ---- Brands ----
export const listBrands = asyncHandler(async (req, res) => {
  const brands = await Brand.find({ isActive: true }).sort('name');
  res.json({ success: true, brands });
});

export const createBrand = asyncHandler(async (req, res) => {
  const body = { ...req.body };
  if (!body.slug && body.name) body.slug = slugify(body.name, { lower: true, strict: true });
  const brand = await Brand.create(body);
  res.status(201).json({ success: true, brand });
});

export const updateBrand = asyncHandler(async (req, res) => {
  const brand = await Brand.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!brand) throw new ApiError(404, 'Brand not found.');
  res.json({ success: true, brand });
});

export const deleteBrand = asyncHandler(async (req, res) => {
  const brand = await Brand.findByIdAndDelete(req.params.id);
  if (!brand) throw new ApiError(404, 'Brand not found.');
  res.json({ success: true, message: 'Brand deleted.' });
});
