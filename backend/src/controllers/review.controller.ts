import { Request, Response } from 'express';
import { z } from 'zod';
import { Review } from '../models/Review';
import { Order } from '../models/Order';
import { Restaurant } from '../models/Restaurant';
import { ApiError } from '../utils/ApiError';

export const createReviewSchema = z.object({
  orderId: z.string(),
  rating: z.number().int().min(1).max(5),
  foodRating: z.number().int().min(1).max(5).optional(),
  deliveryRating: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(2000).optional(),
  photos: z.array(z.string().url()).max(5).default([]),
});

export const createReview = async (req: Request, res: Response) => {
  const body = req.body as z.infer<typeof createReviewSchema>;

  const order = await Order.findOne({ _id: body.orderId, user: req.user!._id });
  if (!order) throw ApiError.notFound('Order not found');
  if (order.status !== 'delivered') throw ApiError.badRequest('You can only review delivered orders');
  if (order.rated) throw ApiError.conflict('This order has already been reviewed');

  const review = await Review.create({
    user: req.user!._id,
    restaurant: order.restaurant,
    order: order._id,
    rating: body.rating,
    foodRating: body.foodRating,
    deliveryRating: body.deliveryRating,
    comment: body.comment,
    photos: body.photos,
  });

  order.rated = true;
  await order.save();

  // Incrementally fold the new rating into the restaurant's aggregate.
  const restaurant = await Restaurant.findById(order.restaurant);
  if (restaurant) {
    restaurant.rating =
      (restaurant.rating * restaurant.ratingCount + body.rating) / (restaurant.ratingCount + 1);
    restaurant.ratingCount += 1;
    await restaurant.save();
  }

  res.status(201).json({ success: true, data: review });
};

export const myReviews = async (req: Request, res: Response) => {
  const reviews = await Review.find({ user: req.user!._id })
    .sort({ createdAt: -1 })
    .populate('restaurant', 'name coverImageUrl')
    .lean();
  res.json({ success: true, data: reviews });
};
