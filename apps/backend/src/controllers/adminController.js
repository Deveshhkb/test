import Order from '../models/Order.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// GET /api/admin/dashboard
export const getDashboard = asyncHandler(async (req, res) => {
  const paidMatch = { $match: { paymentStatus: 'paid' } };

  const [
    revenueAgg,
    orderCount,
    paidOrderCount,
    unitsAgg,
    pendingOrders,
    userCount,
    productCount,
    lowStock,
    recentOrders,
    statusBreakdown,
    topProducts,
    categoryRevenue,
  ] = await Promise.all([
    Order.aggregate([paidMatch, { $group: { _id: null, total: { $sum: '$grandTotal' } } }]),
    Order.countDocuments(),
    Order.countDocuments({ paymentStatus: 'paid' }),
    // Total units sold across paid orders.
    Order.aggregate([
      paidMatch,
      { $unwind: '$items' },
      { $group: { _id: null, units: { $sum: '$items.quantity' } } },
    ]),
    // Orders still in flight (not delivered/cancelled/returned).
    Order.countDocuments({ status: { $in: ['placed', 'confirmed', 'processing', 'shipped'] } }),
    User.countDocuments({ role: 'customer' }),
    Product.countDocuments(),
    Product.find({ 'variants.stock': { $lte: 5 } }).select('title variants').limit(10),
    Order.find().populate('user', 'name email').sort('-createdAt').limit(8),
    Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    // Best-selling products by units sold (paid orders only).
    Order.aggregate([
      paidMatch,
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          title: { $first: '$items.title' },
          units: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
        },
      },
      { $sort: { units: -1 } },
      { $limit: 6 },
    ]),
    // Revenue split by category (paid orders only).
    Order.aggregate([
      paidMatch,
      { $unwind: '$items' },
      { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'prod' } },
      { $unwind: '$prod' },
      { $lookup: { from: 'categories', localField: 'prod.category', foreignField: '_id', as: 'cat' } },
      { $unwind: '$cat' },
      {
        $group: {
          _id: '$cat.name',
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 8 },
    ]),
  ]);

  // Revenue + orders per day over the last 30 days (frontend can window to 7d).
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const salesTrend = await Order.aggregate([
    { $match: { paymentStatus: 'paid', createdAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        revenue: { $sum: '$grandTotal' },
        orders: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const revenue = revenueAgg[0]?.total || 0;
  const unitsSold = unitsAgg[0]?.units || 0;

  res.json({
    success: true,
    stats: {
      revenue,
      orders: orderCount,
      customers: userCount,
      products: productCount,
      unitsSold,
      pendingOrders,
      avgOrderValue: paidOrderCount ? Math.round(revenue / paidOrderCount) : 0,
    },
    lowStock,
    recentOrders,
    statusBreakdown,
    topProducts,
    categoryRevenue,
    salesTrend,
  });
});

// GET /api/admin/customers
export const listCustomers = asyncHandler(async (req, res) => {
  const { search, page = 1, limit = 20 } = req.query;
  const filter = { role: 'customer' };
  if (search) {
    filter.$or = [
      { name: new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') },
    ];
  }
  const skip = (Number(page) - 1) * Number(limit);
  const [customers, total] = await Promise.all([
    User.find(filter).sort('-createdAt').skip(skip).limit(Number(limit)),
    User.countDocuments(filter),
  ]);
  res.json({ success: true, customers, total });
});
