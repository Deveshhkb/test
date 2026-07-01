import crypto from 'crypto';
import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import Coupon from '../models/Coupon.js';
import { asyncHandler, ApiError } from '../utils/asyncHandler.js';
import { getRazorpay } from '../config/razorpay.js';

const genOrderNumber = () =>
  `NS${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1000)}`;

/** Build order items + totals from the user's current cart. */
const buildOrderDraft = async (userId) => {
  const cart = await Cart.findOne({ user: userId }).populate('items.product');
  if (!cart || cart.items.length === 0) throw new ApiError(400, 'Your cart is empty.');

  const items = cart.items.map((i) => ({
    product: i.product._id,
    title: i.product.title,
    image: i.product.images?.[0] || '',
    sku: i.sku,
    color: i.color,
    size: i.size,
    price: i.price,
    quantity: i.quantity,
  }));

  const itemsTotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const discount = cart.coupon?.discount || 0;
  const shippingFee = itemsTotal > 999 ? 0 : 49;
  const grandTotal = Math.max(0, itemsTotal - discount) + shippingFee;

  return { cart, items, itemsTotal, discount, shippingFee, grandTotal };
};

// POST /api/orders  -> create order (and Razorpay order if online payment)
export const createOrder = asyncHandler(async (req, res) => {
  const { shippingAddress, paymentMethod = 'razorpay', shippingMethod = 'standard' } = req.body;
  if (!shippingAddress) throw new ApiError(400, 'Shipping address is required.');

  const draft = await buildOrderDraft(req.user._id);

  const order = await Order.create({
    orderNumber: genOrderNumber(),
    user: req.user._id,
    items: draft.items,
    shippingAddress,
    itemsTotal: draft.itemsTotal,
    shippingFee: draft.shippingFee,
    discount: draft.discount,
    couponCode: draft.cart.coupon?.code || '',
    grandTotal: draft.grandTotal,
    shippingMethod,
    paymentMethod,
    paymentStatus: paymentMethod === 'cod' ? 'pending' : 'pending',
    statusHistory: [{ status: 'placed', note: 'Order created' }],
  });

  // For online payments, create a Razorpay order to hand back to the client.
  let razorpayOrder = null;
  if (paymentMethod === 'razorpay') {
    const rzp = getRazorpay();
    if (rzp) {
      razorpayOrder = await rzp.orders.create({
        amount: draft.grandTotal * 100, // paise
        currency: 'INR',
        receipt: order.orderNumber,
      });
      order.razorpay.orderId = razorpayOrder.id;
      await order.save();
    }
  } else {
    // COD: finalize immediately.
    await finalizeOrder(order, draft.cart);
  }

  res.status(201).json({
    success: true,
    order,
    razorpayOrder,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID || null,
  });
});

// POST /api/orders/verify  -> verify Razorpay signature, finalize order
export const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  if (expected !== razorpaySignature) {
    throw new ApiError(400, 'Payment verification failed.');
  }

  const order = await Order.findOne({ 'razorpay.orderId': razorpayOrderId, user: req.user._id });
  if (!order) throw new ApiError(404, 'Order not found.');

  order.paymentStatus = 'paid';
  order.status = 'confirmed';
  order.razorpay.paymentId = razorpayPaymentId;
  order.razorpay.signature = razorpaySignature;
  order.statusHistory.push({ status: 'confirmed', note: 'Payment verified' });

  const cart = await Cart.findOne({ user: req.user._id });
  await finalizeOrder(order, cart);

  res.json({ success: true, order });
});

/** Decrement stock, bump coupon usage, clear the cart. */
async function finalizeOrder(order, cart) {
  for (const item of order.items) {
    const update = { $inc: { soldCount: item.quantity } };
    await Product.updateOne({ _id: item.product }, update);
    if (item.sku) {
      await Product.updateOne(
        { _id: item.product, 'variants.sku': item.sku },
        { $inc: { 'variants.$.stock': -item.quantity } }
      );
    }
  }
  if (order.couponCode) {
    await Coupon.updateOne({ code: order.couponCode }, { $inc: { usedCount: 1 } });
  }
  if (cart) {
    cart.items = [];
    cart.coupon = { code: '', discount: 0 };
    await cart.save();
  }
  await order.save();
}

// GET /api/orders  -> current user's orders
export const myOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort('-createdAt');
  res.json({ success: true, orders });
});

// GET /api/orders/:id
export const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, 'Order not found.');
  if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ApiError(403, 'Not authorized to view this order.');
  }
  res.json({ success: true, order });
});

// PUT /api/orders/:id/cancel
export const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, 'Order not found.');
  if (order.user.toString() !== req.user._id.toString()) throw new ApiError(403, 'Not authorized.');
  if (['shipped', 'delivered', 'cancelled'].includes(order.status)) {
    throw new ApiError(400, `Cannot cancel an order that is ${order.status}.`);
  }
  order.status = 'cancelled';
  order.statusHistory.push({ status: 'cancelled', note: 'Cancelled by customer' });
  await order.save();
  res.json({ success: true, order });
});

// PUT /api/orders/:id/return  -> request a return for a delivered order
export const requestReturn = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, 'Order not found.');
  if (order.user.toString() !== req.user._id.toString()) throw new ApiError(403, 'Not authorized.');
  if (order.status !== 'delivered') {
    throw new ApiError(400, 'Only delivered orders can be returned.');
  }

  // Enforce a 7-day return window from delivery.
  const deliveredAt =
    [...order.statusHistory].reverse().find((s) => s.status === 'delivered')?.at ||
    order.updatedAt;
  const daysSince = (Date.now() - new Date(deliveredAt).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSince > 7) {
    throw new ApiError(400, 'The 7-day return window for this order has passed.');
  }

  order.status = 'returned';
  order.statusHistory.push({
    status: 'returned',
    note: reason ? `Return requested: ${reason}` : 'Return requested by customer',
  });
  await order.save();
  res.json({ success: true, order });
});

// ---- Admin ----
// GET /api/orders/admin/all
export const listAllOrders = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter = status ? { status } : {};
  const skip = (Number(page) - 1) * Number(limit);
  const [orders, total] = await Promise.all([
    Order.find(filter).populate('user', 'name email').sort('-createdAt').skip(skip).limit(Number(limit)),
    Order.countDocuments(filter),
  ]);
  res.json({ success: true, orders, total });
});

// PUT /api/orders/:id/status  (admin)
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, 'Order not found.');
  order.status = status;
  order.statusHistory.push({ status, note: note || `Status set to ${status}` });
  await order.save();
  res.json({ success: true, order });
});
