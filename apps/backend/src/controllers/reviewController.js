import Review from '../models/Review.js';
import Order from '../models/Order.js';
import { asyncHandler, ApiError } from '../utils/asyncHandler.js';

// GET /api/reviews/product/:productId
export const getProductReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ product: req.params.productId, status: 'approved' })
    .populate('user', 'name avatar')
    .sort('-createdAt');
  res.json({ success: true, reviews });
});

// GET /api/reviews/admin/all  (admin) — all reviews for moderation
export const listAllReviews = asyncHandler(async (req, res) => {
  const filter = req.query.status ? { status: req.query.status } : {};
  const reviews = await Review.find(filter)
    .populate('user', 'name email')
    .populate('product', 'title slug')
    .sort('-createdAt')
    .limit(100);
  res.json({ success: true, reviews });
});

// POST /api/reviews
export const createReview = asyncHandler(async (req, res) => {
  const { productId, rating, title, comment, photos } = req.body;
  if (!productId || !rating) throw new ApiError(400, 'Product and rating are required.');

  const purchased = await Order.exists({
    user: req.user._id,
    'items.product': productId,
    paymentStatus: 'paid',
  });

  try {
    const review = await Review.create({
      product: productId,
      user: req.user._id,
      name: req.user.name,
      rating,
      title,
      comment,
      photos: photos || [],
      verifiedPurchase: Boolean(purchased),
    });
    res.status(201).json({ success: true, review });
  } catch (err) {
    if (err.code === 11000) throw new ApiError(409, 'You have already reviewed this product.');
    throw err;
  }
});

// DELETE /api/reviews/:id
export const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw new ApiError(404, 'Review not found.');
  if (review.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ApiError(403, 'Not authorized.');
  }
  await review.deleteOne();
  await Review.syncProductRating(review.product);
  res.json({ success: true, message: 'Review deleted.' });
});

// PUT /api/reviews/:id/moderate  (admin)
export const moderateReview = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const review = await Review.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!review) throw new ApiError(404, 'Review not found.');
  await Review.syncProductRating(review.product);
  res.json({ success: true, review });
});
