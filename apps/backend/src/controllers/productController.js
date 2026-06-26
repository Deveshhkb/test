import slugify from 'slugify';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import { asyncHandler, ApiError } from '../utils/asyncHandler.js';

/**
 * GET /api/products
 * Supports: search, category(slug), brand, gender, collection, color, size,
 * minPrice, maxPrice, sort, page, limit.
 */
export const listProducts = asyncHandler(async (req, res) => {
  const {
    search,
    category,
    brand,
    gender,
    collection,
    color,
    size,
    minPrice,
    maxPrice,
    sort = '-createdAt',
    page = 1,
    limit = 12,
  } = req.query;

  const filter = { isActive: true };

  if (search) filter.$text = { $search: search };
  if (gender) filter.gender = gender;
  if (collection) filter.collections = collection;
  if (brand) filter.brand = brand;
  if (size) filter.sizes = size;
  if (color) filter['colors.name'] = new RegExp(`^${color}$`, 'i');

  if (category) {
    const cat = await Category.findOne({ slug: category });
    if (cat) filter.category = cat._id;
  }

  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  const sortMap = {
    'price-asc': { price: 1 },
    'price-desc': { price: -1 },
    popular: { soldCount: -1 },
    rating: { ratingAverage: -1 },
    newest: { createdAt: -1 },
  };
  const sortBy = sortMap[sort] || sort;

  const pageNum = Math.max(1, Number(page));
  const perPage = Math.min(60, Number(limit));
  const skip = (pageNum - 1) * perPage;

  const [items, total] = await Promise.all([
    Product.find(filter)
      .populate('category', 'name slug')
      .populate('brand', 'name slug')
      .sort(sortBy)
      .skip(skip)
      .limit(perPage),
    Product.countDocuments(filter),
  ]);

  res.json({
    success: true,
    products: items,
    pagination: {
      page: pageNum,
      limit: perPage,
      total,
      pages: Math.ceil(total / perPage),
      hasMore: skip + items.length < total,
    },
  });
});

// GET /api/products/:idOrSlug
export const getProduct = asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params;
  const query = idOrSlug.match(/^[0-9a-fA-F]{24}$/)
    ? { _id: idOrSlug }
    : { slug: idOrSlug };

  const product = await Product.findOne(query)
    .populate('category', 'name slug')
    .populate('brand', 'name slug');
  if (!product) throw new ApiError(404, 'Product not found.');

  const related = await Product.find({
    _id: { $ne: product._id },
    category: product.category,
    isActive: true,
  })
    .limit(8)
    .select('title slug price compareAtPrice images ratingAverage');

  res.json({ success: true, product, related });
});

// POST /api/products  (admin)
export const createProduct = asyncHandler(async (req, res) => {
  const body = { ...req.body };
  if (!body.slug && body.title) {
    body.slug = slugify(body.title, { lower: true, strict: true });
  }
  const product = await Product.create(body);
  res.status(201).json({ success: true, product });
});

// PUT /api/products/:id  (admin)
export const updateProduct = asyncHandler(async (req, res) => {
  const body = { ...req.body };
  if (body.title && !body.slug) {
    body.slug = slugify(body.title, { lower: true, strict: true });
  }
  const product = await Product.findByIdAndUpdate(req.params.id, body, {
    new: true,
    runValidators: true,
  });
  if (!product) throw new ApiError(404, 'Product not found.');
  res.json({ success: true, product });
});

// DELETE /api/products/:id  (admin)
export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) throw new ApiError(404, 'Product not found.');
  res.json({ success: true, message: 'Product deleted.' });
});
