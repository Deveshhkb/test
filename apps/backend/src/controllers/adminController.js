import Order from '../models/Order.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// GET /api/admin/dashboard
export const getDashboard = asyncHandler(async (req, res) => {
  const [
    revenueAgg,
    orderCount,
    userCount,
    productCount,
    lowStock,
    recentOrders,
    statusBreakdown,
  ] = await Promise.all([
    Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } },
    ]),
    Order.countDocuments(),
    User.countDocuments({ role: 'customer' }),
    Product.countDocuments(),
    Product.find({ 'variants.stock': { $lte: 5 } }).select('title variants').limit(10),
    Order.find().populate('user', 'name email').sort('-createdAt').limit(8),
    Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);

  // Revenue over the last 7 days for a simple chart.
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
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

  res.json({
    success: true,
    stats: {
      revenue: revenueAgg[0]?.total || 0,
      orders: orderCount,
      customers: userCount,
      products: productCount,
    },
    lowStock,
    recentOrders,
    statusBreakdown,
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
