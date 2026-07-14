import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { Driver } from '../models/Driver';
import { Order } from '../models/Order';
import { ApiError } from '../utils/ApiError';
import { emitOrderUpdate } from '../sockets';
import { dispatchToNearestDriver } from './order.controller';

export const registerDriverSchema = z.object({
  vehicleType: z.enum(['bike', 'scooter', 'bicycle', 'car']),
  vehicleNumber: z.string().min(3),
  licenseNumber: z.string().min(3),
});

export const registerDriver = async (req: Request, res: Response) => {
  const existing = await Driver.findOne({ user: req.user!._id });
  if (existing) throw ApiError.conflict('Driver profile already exists');
  const driver = await Driver.create({ user: req.user!._id, ...req.body });
  req.user!.role = 'driver';
  await req.user!.save();
  res.status(201).json({ success: true, data: driver });
};

export const getMyDriverProfile = async (req: Request, res: Response) => {
  const driver = await Driver.findOne({ user: req.user!._id }).populate('activeOrder');
  if (!driver) throw ApiError.notFound('Driver profile not found');
  res.json({ success: true, data: driver });
};

export const setOnlineStatus = async (req: Request, res: Response) => {
  const { isOnline, lat, lng } = req.body as { isOnline: boolean; lat?: number; lng?: number };
  const driver = await Driver.findOne({ user: req.user!._id });
  if (!driver) throw ApiError.notFound('Driver profile not found');
  if (!driver.isApproved) throw ApiError.forbidden('Driver not yet approved');
  driver.isOnline = isOnline;
  if (lat !== undefined && lng !== undefined) {
    driver.currentLocation = { type: 'Point', coordinates: [lng, lat] };
  }
  await driver.save();
  res.json({ success: true, data: driver });
};

export const acceptOrder = async (req: Request, res: Response) => {
  const driver = await Driver.findOne({ user: req.user!._id });
  if (!driver?.isApproved) throw ApiError.forbidden('Driver not approved');
  if (driver.activeOrder) throw ApiError.conflict('You already have an active delivery');

  // Atomic claim — loses gracefully if another driver got it first.
  const order = await Order.findOneAndUpdate(
    { _id: req.params.id, driver: { $exists: false }, status: { $in: ['placed', 'confirmed', 'preparing', 'ready_for_pickup'] } },
    { driver: req.user!._id },
    { new: true },
  ).populate('restaurant', 'name address location');
  if (!order) throw ApiError.conflict('Order was already assigned');

  driver.activeOrder = order._id as Types.ObjectId;
  await driver.save();

  emitOrderUpdate(order.id, {
    orderId: order.id,
    status: order.status,
    driverAssigned: { name: req.user!.name, phone: req.user!.phone },
    at: Date.now(),
  });
  res.json({ success: true, data: order });
};

export const rejectOrder = async (req: Request, res: Response) => {
  // Re-dispatch to the next nearest driver.
  await dispatchToNearestDriver(req.params.id);
  res.json({ success: true });
};

export const earnings = async (req: Request, res: Response) => {
  const driver = await Driver.findOne({ user: req.user!._id }).lean();
  if (!driver) throw ApiError.notFound('Driver profile not found');

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const sumSince = (since: Date) =>
    driver.earnings.filter((e) => e.date >= since).reduce((s, e) => s + e.amount, 0);

  res.json({
    success: true,
    data: {
      today: sumSince(startOfDay),
      week: sumSince(startOfWeek),
      month: sumSince(startOfMonth),
      lifetime: driver.earnings.reduce((s, e) => s + e.amount, 0),
      totalDeliveries: driver.totalDeliveries,
      rating: driver.rating,
      recent: driver.earnings.slice(-20).reverse(),
    },
  });
};
