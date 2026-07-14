import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { catchAsync } from '../utils/catchAsync';
import * as auth from '../controllers/auth.controller';
import * as restaurants from '../controllers/restaurant.controller';
import * as orders from '../controllers/order.controller';
import * as users from '../controllers/user.controller';
import * as reviews from '../controllers/review.controller';
import * as drivers from '../controllers/driver.controller';
import * as admin from '../controllers/admin.controller';
import { verifyRazorpayPayment } from '../services/payment.service';
import { recommendForUser, alsoOrderedWith } from '../services/recommendation.service';
import { Coupon } from '../models/Coupon';

export const apiRouter = Router();

// ---- Auth ----
apiRouter.post('/auth/firebase', validate(auth.firebaseLoginSchema), catchAsync(auth.firebaseLogin));
apiRouter.get('/auth/me', requireAuth, catchAsync(auth.me));
apiRouter.post('/auth/logout', requireAuth, catchAsync(auth.logout));

// ---- Discovery (public) ----
apiRouter.get('/categories', catchAsync(restaurants.listCategories));
apiRouter.get('/restaurants', validate(restaurants.listQuerySchema, 'query'), catchAsync(restaurants.listRestaurants));
apiRouter.get('/restaurants/:id', catchAsync(restaurants.getRestaurant));
apiRouter.get('/restaurants/:id/menu', catchAsync(restaurants.getMenu));
apiRouter.get('/restaurants/:id/reviews', catchAsync(restaurants.getRestaurantReviews));

// ---- Coupons ----
apiRouter.get('/coupons', requireAuth, catchAsync(async (_req, res) => {
  const now = new Date();
  const coupons = await Coupon.find({
    isActive: true, validFrom: { $lte: now }, validUntil: { $gte: now },
  }).select('-usedCount -totalUsageLimit').lean();
  res.json({ success: true, data: coupons });
}));

// ---- Orders ----
apiRouter.post('/orders', requireAuth, validate(orders.createOrderSchema), catchAsync(orders.createOrder));
apiRouter.get('/orders', requireAuth, catchAsync(orders.myOrders));
apiRouter.get('/orders/:id', requireAuth, catchAsync(orders.getOrder));
apiRouter.post('/orders/:id/cancel', requireAuth, catchAsync(orders.cancelOrder));
apiRouter.patch(
  '/orders/:id/status',
  requireAuth,
  requireRole('admin', 'driver', 'restaurant_owner'),
  validate(z.object({ status: z.string() })),
  catchAsync(orders.updateOrderStatus),
);

// ---- Payments ----
apiRouter.post(
  '/payments/razorpay/verify',
  requireAuth,
  validate(z.object({
    razorpayOrderId: z.string(),
    razorpayPaymentId: z.string(),
    razorpaySignature: z.string(),
  })),
  catchAsync(async (req, res) => {
    const orderId = await verifyRazorpayPayment(req.body);
    res.json({ success: true, data: { orderId } });
  }),
);

// ---- Profile / addresses / wishlist ----
apiRouter.patch('/users/me', requireAuth, validate(users.updateProfileSchema), catchAsync(users.updateProfile));
apiRouter.post('/users/me/addresses', requireAuth, validate(users.addressSchema), catchAsync(users.addAddress));
apiRouter.delete('/users/me/addresses/:addressId', requireAuth, catchAsync(users.removeAddress));
apiRouter.post('/users/me/wishlist/:restaurantId', requireAuth, catchAsync(users.toggleWishlist));
apiRouter.get('/users/me/wishlist', requireAuth, catchAsync(users.getWishlist));

// ---- Reviews ----
apiRouter.post('/reviews', requireAuth, validate(reviews.createReviewSchema), catchAsync(reviews.createReview));
apiRouter.get('/reviews/mine', requireAuth, catchAsync(reviews.myReviews));

// ---- Recommendations ----
apiRouter.get('/recommendations', requireAuth, catchAsync(async (req, res) => {
  res.json({ success: true, data: await recommendForUser(req.user!.id) });
}));
apiRouter.post(
  '/recommendations/also-ordered',
  requireAuth,
  validate(z.object({ menuItemIds: z.array(z.string()).min(1) })),
  catchAsync(async (req, res) => {
    res.json({ success: true, data: await alsoOrderedWith(req.body.menuItemIds) });
  }),
);

// ---- Driver ----
apiRouter.post('/drivers/register', requireAuth, validate(drivers.registerDriverSchema), catchAsync(drivers.registerDriver));
apiRouter.get('/drivers/me', requireAuth, requireRole('driver'), catchAsync(drivers.getMyDriverProfile));
apiRouter.patch('/drivers/me/status', requireAuth, requireRole('driver'), catchAsync(drivers.setOnlineStatus));
apiRouter.post('/drivers/orders/:id/accept', requireAuth, requireRole('driver'), catchAsync(drivers.acceptOrder));
apiRouter.post('/drivers/orders/:id/reject', requireAuth, requireRole('driver'), catchAsync(drivers.rejectOrder));
apiRouter.get('/drivers/me/earnings', requireAuth, requireRole('driver'), catchAsync(drivers.earnings));

// ---- Admin ----
const adminOnly = [requireAuth, requireRole('admin')] as const;
apiRouter.post('/admin/restaurants', ...adminOnly, catchAsync(admin.createRestaurant));
apiRouter.patch('/admin/restaurants/:id', ...adminOnly, catchAsync(admin.updateRestaurant));
apiRouter.put('/admin/restaurants/:id/menu', ...adminOnly, catchAsync(admin.upsertMenuItem));
apiRouter.get('/admin/orders', ...adminOnly, catchAsync(admin.listOrders));
apiRouter.get('/admin/drivers', ...adminOnly, catchAsync(admin.listDrivers));
apiRouter.patch('/admin/drivers/:id/approve', ...adminOnly, catchAsync(admin.approveDriver));
apiRouter.get('/admin/coupons', ...adminOnly, catchAsync(admin.listCoupons));
apiRouter.post('/admin/coupons', ...adminOnly, catchAsync(admin.createCoupon));
apiRouter.patch('/admin/coupons/:id', ...adminOnly, catchAsync(admin.updateCoupon));
apiRouter.get('/admin/analytics', ...adminOnly, catchAsync(admin.analytics));
