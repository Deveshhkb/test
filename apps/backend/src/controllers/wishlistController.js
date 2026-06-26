import Wishlist from '../models/Wishlist.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// GET /api/wishlist
export const getWishlist = asyncHandler(async (req, res) => {
  let wishlist = await Wishlist.findOne({ user: req.user._id }).populate(
    'products',
    'title slug price compareAtPrice images ratingAverage'
  );
  if (!wishlist) wishlist = await Wishlist.create({ user: req.user._id, products: [] });
  res.json({ success: true, wishlist });
});

// POST /api/wishlist  -> toggle a product
export const toggleWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.body;
  let wishlist = await Wishlist.findOne({ user: req.user._id });
  if (!wishlist) wishlist = await Wishlist.create({ user: req.user._id, products: [] });

  const idx = wishlist.products.findIndex((p) => p.toString() === productId);
  let added;
  if (idx > -1) {
    wishlist.products.splice(idx, 1);
    added = false;
  } else {
    wishlist.products.push(productId);
    added = true;
  }
  await wishlist.save();
  res.json({ success: true, added, count: wishlist.products.length });
});

// DELETE /api/wishlist/:productId
export const removeFromWishlist = asyncHandler(async (req, res) => {
  const wishlist = await Wishlist.findOneAndUpdate(
    { user: req.user._id },
    { $pull: { products: req.params.productId } },
    { new: true }
  );
  res.json({ success: true, wishlist });
});
