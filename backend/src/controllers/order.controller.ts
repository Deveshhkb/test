import { Request, Response } from 'express';
import { z } from 'zod';
import { Order, OrderStatus } from '../models/Order';
import { MenuItem } from '../models/MenuItem';
import { Restaurant } from '../models/Restaurant';
import { Coupon } from '../models/Coupon';
import { Driver } from '../models/Driver';
import { ApiError } from '../utils/ApiError';
import { emitOrderUpdate, offerOrderToDriver } from '../sockets';
import { createPaymentOrder } from '../services/payment.service';
import { notifyUser } from '../services/notification.service';

const TAX_RATE = 0.05;

export const createOrderSchema = z.object({
  restaurantId: z.string(),
  items: z.array(
    z.object({
      menuItemId: z.string(),
      quantity: z.number().int().min(1).max(20),
      variant: z.string().optional(),
      addOns: z.array(z.string()).default([]),
    }),
  ).min(1),
  addressId: z.string(),
  couponCode: z.string().optional(),
  paymentProvider: z.enum(['razorpay', 'stripe', 'cod']).default('razorpay'),
  specialInstructions: z.string().max(500).optional(),
});

/** Prices are always recomputed server-side — the client's cart totals are never trusted. */
export const createOrder = async (req: Request, res: Response) => {
  const body = req.body as z.infer<typeof createOrderSchema>;
  const user = req.user!;

  const restaurant = await Restaurant.findById(body.restaurantId);
  if (!restaurant || !restaurant.isActive) throw ApiError.notFound('Restaurant not found');
  if (!restaurant.isOpen) throw ApiError.badRequest('Restaurant is currently closed', 'RESTAURANT_CLOSED');

  const address = user.addresses.find((a) => a._id?.toString() === body.addressId);
  if (!address) throw ApiError.badRequest('Delivery address not found');

  const menuItems = await MenuItem.find({
    _id: { $in: body.items.map((i) => i.menuItemId) },
    restaurant: restaurant._id,
    isAvailable: true,
  });
  const menuById = new Map(menuItems.map((m) => [m.id, m]));

  let itemsTotal = 0;
  const orderItems = body.items.map((line) => {
    const menu = menuById.get(line.menuItemId);
    if (!menu) throw ApiError.badRequest('One or more items are unavailable', 'ITEM_UNAVAILABLE');

    const variant = line.variant
      ? menu.variants.find((v) => v.name === line.variant)
      : undefined;
    if (line.variant && !variant) throw ApiError.badRequest(`Invalid variant for ${menu.name}`);

    const addOns = line.addOns.map((name) => {
      const addOn = menu.addOns.find((a) => a.name === name);
      if (!addOn) throw ApiError.badRequest(`Invalid add-on for ${menu.name}`);
      return { name: addOn.name, price: addOn.price };
    });

    const unitPrice =
      (variant ? variant.price : menu.basePrice) +
      addOns.reduce((sum, a) => sum + a.price, 0);
    const totalPrice = unitPrice * line.quantity;
    itemsTotal += totalPrice;

    return {
      menuItem: menu._id,
      name: menu.name,
      quantity: line.quantity,
      unitPrice,
      variant: variant?.name,
      addOns,
      totalPrice,
    };
  });

  if (itemsTotal < restaurant.minOrderAmount) {
    throw ApiError.badRequest(`Minimum order is ₹${restaurant.minOrderAmount}`, 'MIN_ORDER');
  }

  // Coupon
  let discount = 0;
  let couponApplied: { code: string; discount: number } | undefined;
  if (body.couponCode) {
    const coupon = await validateCouponForOrder(body.couponCode, itemsTotal, restaurant.id, user.id);
    discount = computeDiscount(coupon, itemsTotal);
    couponApplied = { code: coupon.code, discount };
    coupon.usedCount += 1;
    await coupon.save();
  }

  const taxes = Math.round((itemsTotal - discount) * TAX_RATE);
  const grandTotal = itemsTotal - discount + taxes + restaurant.deliveryFee;

  const order = await Order.create({
    orderNumber: `SV${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 90 + 10)}`,
    user: user._id,
    restaurant: restaurant._id,
    items: orderItems,
    status: body.paymentProvider === 'cod' ? 'placed' : 'pending_payment',
    statusHistory: [{ status: body.paymentProvider === 'cod' ? 'placed' : 'pending_payment', at: new Date() }],
    deliveryAddress: {
      line1: address.line1,
      city: address.city,
      pincode: address.pincode,
      location: address.location,
    },
    pricing: { itemsTotal, deliveryFee: restaurant.deliveryFee, taxes, discount, grandTotal },
    coupon: couponApplied,
    payment: { provider: body.paymentProvider, status: 'pending' },
    eta: new Date(Date.now() + restaurant.deliveryTimeMins * 60_000),
    specialInstructions: body.specialInstructions,
  });

  // For online payments, create the provider order so the app can open the pay sheet.
  let paymentIntent: unknown = null;
  if (body.paymentProvider !== 'cod') {
    paymentIntent = await createPaymentOrder(body.paymentProvider, grandTotal, order.id);
    order.payment.providerOrderId = (paymentIntent as { id: string }).id;
    await order.save();
  } else {
    await dispatchToNearestDriver(order.id);
  }

  res.status(201).json({ success: true, data: { order, paymentIntent } });
};

const STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ['placed', 'cancelled'],
  placed: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready_for_pickup'],
  ready_for_pickup: ['picked_up'],
  picked_up: ['on_the_way'],
  on_the_way: ['delivered'],
  delivered: [],
  cancelled: [],
};

export const updateOrderStatus = async (req: Request, res: Response) => {
  const { status } = req.body as { status: OrderStatus };
  const order = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound('Order not found');

  if (!STATUS_FLOW[order.status]?.includes(status)) {
    throw ApiError.badRequest(`Cannot transition from ${order.status} to ${status}`, 'BAD_TRANSITION');
  }

  order.status = status;
  order.statusHistory.push({ status, at: new Date() });
  await order.save();

  emitOrderUpdate(order.id, { orderId: order.id, status, at: Date.now() });
  await notifyUser(order.user.toString(), statusNotification(status, order.orderNumber), {
    type: 'order_update', orderId: order.id,
  });

  if (status === 'delivered' && order.driver) {
    const fee = Math.max(25, Math.round(order.pricing.deliveryFee * 0.8));
    await Driver.updateOne(
      { user: order.driver },
      {
        $inc: { totalDeliveries: 1 },
        $unset: { activeOrder: 1 },
        $push: { earnings: { date: new Date(), amount: fee, order: order._id } },
      },
    );
  }

  res.json({ success: true, data: order });
};

export const myOrders = async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = 15;
  const orders = await Order.find({ user: req.user!._id })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('restaurant', 'name coverImageUrl')
    .lean();
  res.json({ success: true, data: orders });
};

export const getOrder = async (req: Request, res: Response) => {
  const order = await Order.findById(req.params.id)
    .populate('restaurant', 'name coverImageUrl address location')
    .populate('driver', 'name phone avatarUrl')
    .lean();
  if (!order) throw ApiError.notFound('Order not found');

  const isOwner = order.user.toString() === req.user!.id;
  const isDriver = order.driver?._id?.toString() === req.user!.id;
  if (!isOwner && !isDriver && req.user!.role !== 'admin') throw ApiError.forbidden();

  res.json({ success: true, data: order });
};

export const cancelOrder = async (req: Request, res: Response) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user!._id });
  if (!order) throw ApiError.notFound('Order not found');
  if (!['pending_payment', 'placed', 'confirmed'].includes(order.status)) {
    throw ApiError.badRequest('Order can no longer be cancelled', 'TOO_LATE');
  }
  order.status = 'cancelled';
  order.statusHistory.push({ status: 'cancelled', at: new Date() });
  if (order.payment.status === 'paid') order.payment.status = 'refunded';
  await order.save();
  emitOrderUpdate(order.id, { orderId: order.id, status: 'cancelled', at: Date.now() });
  res.json({ success: true, data: order });
};

/** Offer the order to the nearest online, approved, idle driver. */
export const dispatchToNearestDriver = async (orderId: string): Promise<void> => {
  const order = await Order.findById(orderId).populate('restaurant', 'name location address');
  if (!order) return;
  const restaurant = order.restaurant as unknown as { location: { coordinates: [number, number] }; name: string; address: string };

  const driver = await Driver.findOne({
    isOnline: true,
    isApproved: true,
    activeOrder: { $exists: false },
    currentLocation: {
      $near: {
        $geometry: restaurant.location,
        $maxDistance: 10_000,
      },
    },
  });

  if (driver) {
    offerOrderToDriver(driver.user.toString(), {
      orderId: order.id,
      orderNumber: order.orderNumber,
      restaurantName: restaurant.name,
      pickupAddress: restaurant.address,
      dropAddress: order.deliveryAddress.line1,
      payout: Math.max(25, Math.round(order.pricing.deliveryFee * 0.8)),
      expiresInSec: 45,
    });
  }
};

// ---- helpers ----

async function validateCouponForOrder(code: string, itemsTotal: number, restaurantId: string, userId: string) {
  const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });
  if (!coupon) throw ApiError.badRequest('Invalid coupon code', 'COUPON_INVALID');
  const now = new Date();
  if (now < coupon.validFrom || now > coupon.validUntil) {
    throw ApiError.badRequest('Coupon has expired', 'COUPON_EXPIRED');
  }
  if (coupon.totalUsageLimit && coupon.usedCount >= coupon.totalUsageLimit) {
    throw ApiError.badRequest('Coupon usage limit reached', 'COUPON_EXHAUSTED');
  }
  if (coupon.restaurant && coupon.restaurant.toString() !== restaurantId) {
    throw ApiError.badRequest('Coupon not valid for this restaurant', 'COUPON_SCOPE');
  }
  if (itemsTotal < coupon.minOrderAmount) {
    throw ApiError.badRequest(`Add ₹${coupon.minOrderAmount - itemsTotal} more to use this coupon`, 'COUPON_MIN_ORDER');
  }
  const priorUses = await Order.countDocuments({
    user: userId, 'coupon.code': coupon.code, status: { $ne: 'cancelled' },
  });
  if (priorUses >= coupon.usageLimitPerUser) {
    throw ApiError.badRequest('You have already used this coupon', 'COUPON_USED');
  }
  return coupon;
}

function computeDiscount(coupon: { discountType: string; discountValue: number; maxDiscount?: number }, itemsTotal: number): number {
  const raw = coupon.discountType === 'percent'
    ? (itemsTotal * coupon.discountValue) / 100
    : coupon.discountValue;
  return Math.round(Math.min(raw, coupon.maxDiscount ?? raw, itemsTotal));
}

function statusNotification(status: OrderStatus, orderNumber: string): { title: string; body: string } {
  const map: Partial<Record<OrderStatus, { title: string; body: string }>> = {
    confirmed: { title: 'Order confirmed 🎉', body: `${orderNumber} is confirmed and heading to the kitchen.` },
    preparing: { title: 'Cooking has started 👨‍🍳', body: `The restaurant is preparing ${orderNumber}.` },
    picked_up: { title: 'Order picked up 🛵', body: `Your rider has collected ${orderNumber}.` },
    on_the_way: { title: 'On the way 📍', body: `${orderNumber} is on the move — track it live!` },
    delivered: { title: 'Delivered — enjoy! 🍽️', body: `${orderNumber} has arrived. Bon appétit!` },
    cancelled: { title: 'Order cancelled', body: `${orderNumber} was cancelled. Any payment will be refunded.` },
  };
  return map[status] ?? { title: 'Order update', body: `${orderNumber}: ${status.replace(/_/g, ' ')}` };
}
