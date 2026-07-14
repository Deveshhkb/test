import { Request, Response } from 'express';
import { Restaurant } from '../models/Restaurant';
import { MenuItem } from '../models/MenuItem';
import { Order } from '../models/Order';
import { Driver } from '../models/Driver';
import { Coupon } from '../models/Coupon';
import { User } from '../models/User';
import { ApiError } from '../utils/ApiError';

// ---- Restaurants ----

export const createRestaurant = async (req: Request, res: Response) => {
  const restaurant = await Restaurant.create(req.body);
  res.status(201).json({ success: true, data: restaurant });
};

export const updateRestaurant = async (req: Request, res: Response) => {
  const restaurant = await Restaurant.findByIdAndUpdate(req.params.id, req.body, {
    new: true, runValidators: true,
  });
  if (!restaurant) throw ApiError.notFound('Restaurant not found');
  res.json({ success: true, data: restaurant });
};

export const upsertMenuItem = async (req: Request, res: Response) => {
  const item = req.body._id
    ? await MenuItem.findByIdAndUpdate(req.body._id, req.body, { new: true })
    : await MenuItem.create({ ...req.body, restaurant: req.params.id });
  res.json({ success: true, data: item });
};

// ---- Orders ----

export const listOrders = async (req: Request, res: Response) => {
  const { status, page = '1' } = req.query as Record<string, string>;
  const filter = status ? { status } : {};
  const limit = 25;
  const [items, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * limit)
      .limit(limit)
      .populate('user', 'name phone')
      .populate('restaurant', 'name')
      .populate('driver', 'name phone')
      .lean(),
    Order.countDocuments(filter),
  ]);
  res.json({ success: true, data: { items, total } });
};

// ---- Drivers ----

export const listDrivers = async (_req: Request, res: Response) => {
  const drivers = await Driver.find().populate('user', 'name phone email').lean();
  res.json({ success: true, data: drivers });
};

export const approveDriver = async (req: Request, res: Response) => {
  const driver = await Driver.findByIdAndUpdate(
    req.params.id,
    { isApproved: req.body.isApproved ?? true },
    { new: true },
  );
  if (!driver) throw ApiError.notFound('Driver not found');
  res.json({ success: true, data: driver });
};

// ---- Coupons ----

export const listCoupons = async (_req: Request, res: Response) => {
  res.json({ success: true, data: await Coupon.find().sort({ createdAt: -1 }).lean() });
};

export const createCoupon = async (req: Request, res: Response) => {
  const coupon = await Coupon.create(req.body);
  res.status(201).json({ success: true, data: coupon });
};

export const updateCoupon = async (req: Request, res: Response) => {
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!coupon) throw ApiError.notFound('Coupon not found');
  res.json({ success: true, data: coupon });
};

// ---- Reports & analytics ----

export const analytics = async (_req: Request, res: Response) => {
  const since30d = new Date(Date.now() - 30 * 24 * 3600_000);

  const [totals, revenueByDay, topRestaurants, statusBreakdown] = await Promise.all([
    Promise.all([
      Order.countDocuments({ createdAt: { $gte: since30d } }),
      Order.aggregate([
        { $match: { status: 'delivered', createdAt: { $gte: since30d } } },
        { $group: { _id: null, revenue: { $sum: '$pricing.grandTotal' } } },
      ]),
      User.countDocuments({ role: 'customer' }),
      Driver.countDocuments({ isOnline: true }),
    ]),
    Order.aggregate([
      { $match: { status: 'delivered', createdAt: { $gte: since30d } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$pricing.grandTotal' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Order.aggregate([
      { $match: { status: 'delivered', createdAt: { $gte: since30d } } },
      { $group: { _id: '$restaurant', revenue: { $sum: '$pricing.grandTotal' }, orders: { $sum: 1 } } },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'restaurants', localField: '_id', foreignField: '_id', as: 'restaurant' } },
      { $unwind: '$restaurant' },
      { $project: { name: '$restaurant.name', revenue: 1, orders: 1 } },
    ]),
    Order.aggregate([
      { $match: { createdAt: { $gte: since30d } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);

  const [orders30d, revenueAgg, customers, onlineDrivers] = totals;
  res.json({
    success: true,
    data: {
      orders30d,
      revenue30d: revenueAgg[0]?.revenue ?? 0,
      customers,
      onlineDrivers,
      revenueByDay,
      topRestaurants,
      statusBreakdown,
    },
  });
};
