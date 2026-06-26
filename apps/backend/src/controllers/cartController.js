import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import Coupon from '../models/Coupon.js';
import { asyncHandler, ApiError } from '../utils/asyncHandler.js';

const populateCart = (cart) => cart.populate('items.product', 'title slug images price compareAtPrice');

/** Compute totals from the cart's items + coupon. */
const summarize = (cart) => {
  const itemsTotal = cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const discount = cart.coupon?.discount || 0;
  const shippingFee = itemsTotal > 999 || itemsTotal === 0 ? 0 : 49;
  return {
    itemsTotal,
    discount,
    shippingFee,
    grandTotal: Math.max(0, itemsTotal - discount) + shippingFee,
    itemCount: cart.items.reduce((n, i) => n + i.quantity, 0),
  };
};

// GET /api/cart
export const getCart = asyncHandler(async (req, res) => {
  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart) cart = await Cart.create({ user: req.user._id, items: [] });
  await populateCart(cart);
  res.json({ success: true, cart, summary: summarize(cart) });
});

// POST /api/cart  -> add or update an item
export const addToCart = asyncHandler(async (req, res) => {
  const { productId, variantId = null, quantity = 1, color = '', size = '' } = req.body;

  const product = await Product.findById(productId);
  if (!product) throw new ApiError(404, 'Product not found.');

  let unitPrice = product.price;
  let sku = '';
  if (variantId) {
    const variant = product.variants.id(variantId);
    if (!variant) throw new ApiError(400, 'Invalid product variant.');
    if (variant.stock < quantity) throw new ApiError(400, 'Not enough stock available.');
    unitPrice = variant.price || product.price;
    sku = variant.sku;
  }

  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart) cart = await Cart.create({ user: req.user._id, items: [] });

  const existing = cart.items.find(
    (i) =>
      i.product.toString() === productId &&
      String(i.variantId) === String(variantId) &&
      i.size === size &&
      i.color === color
  );

  if (existing) {
    existing.quantity += Number(quantity);
  } else {
    cart.items.push({ product: productId, variantId, sku, color, size, quantity, price: unitPrice });
  }

  await cart.save();
  await populateCart(cart);
  res.json({ success: true, cart, summary: summarize(cart) });
});

// PUT /api/cart/item/:itemId  -> set quantity
export const updateItem = asyncHandler(async (req, res) => {
  const { quantity } = req.body;
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) throw new ApiError(404, 'Cart not found.');

  const item = cart.items.id(req.params.itemId);
  if (!item) throw new ApiError(404, 'Item not found in cart.');

  if (Number(quantity) <= 0) item.deleteOne();
  else item.quantity = Number(quantity);

  await cart.save();
  await populateCart(cart);
  res.json({ success: true, cart, summary: summarize(cart) });
});

// DELETE /api/cart/item/:itemId
export const removeItem = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) throw new ApiError(404, 'Cart not found.');
  const item = cart.items.id(req.params.itemId);
  if (item) item.deleteOne();
  await cart.save();
  await populateCart(cart);
  res.json({ success: true, cart, summary: summarize(cart) });
});

// POST /api/cart/coupon
export const applyCoupon = asyncHandler(async (req, res) => {
  const { code } = req.body;
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart || cart.items.length === 0) throw new ApiError(400, 'Cart is empty.');

  const coupon = await Coupon.findOne({ code: String(code).toUpperCase() });
  if (!coupon) throw new ApiError(404, 'Invalid coupon code.');

  const subtotal = cart.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const result = coupon.evaluate(subtotal);
  if (!result.valid) throw new ApiError(400, result.message);

  cart.coupon = { code: coupon.code, discount: result.discount };
  await cart.save();
  await populateCart(cart);
  res.json({ success: true, cart, summary: summarize(cart), message: result.message });
});

// DELETE /api/cart/coupon
export const removeCoupon = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });
  if (cart) {
    cart.coupon = { code: '', discount: 0 };
    await cart.save();
    await populateCart(cart);
  }
  res.json({ success: true, cart, summary: summarize(cart) });
});

export { summarize };
