import { Request, Response } from 'express';
import { z } from 'zod';
import { Restaurant } from '../models/Restaurant';
import { MenuItem } from '../models/MenuItem';
import { Category } from '../models/Category';
import { Review } from '../models/Review';
import { ApiError } from '../utils/ApiError';

export const listQuerySchema = z.object({
  search: z.string().max(120).optional(),
  category: z.string().optional(),
  cuisine: z.string().optional(),
  vegOnly: z.coerce.boolean().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  maxDeliveryTime: z.coerce.number().optional(),
  maxPriceForTwo: z.coerce.number().optional(),
  sort: z.enum(['rating', 'delivery_time', 'price_low', 'price_high', 'relevance']).default('relevance'),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
});

export const listRestaurants = async (req: Request, res: Response) => {
  const q = req.query as unknown as z.infer<typeof listQuerySchema>;
  const filter: Record<string, unknown> = { isActive: true };

  if (q.search) filter.$text = { $search: q.search };
  if (q.cuisine) filter.cuisines = q.cuisine;
  if (q.category) {
    const cat = await Category.findOne({ slug: q.category });
    if (cat) filter.categories = cat._id;
  }
  if (q.vegOnly) filter.isVegOnly = true;
  if (q.minRating) filter.rating = { $gte: q.minRating };
  if (q.maxDeliveryTime) filter.deliveryTimeMins = { $lte: q.maxDeliveryTime };
  if (q.maxPriceForTwo) filter.priceForTwo = { $lte: q.maxPriceForTwo };

  // Nearby search (25 km radius) when the client sends its location.
  if (q.lat !== undefined && q.lng !== undefined && !q.search) {
    filter.location = {
      $near: {
        $geometry: { type: 'Point', coordinates: [q.lng, q.lat] },
        $maxDistance: 25_000,
      },
    };
  }

  const sortMap: Record<string, Record<string, 1 | -1>> = {
    rating: { rating: -1 },
    delivery_time: { deliveryTimeMins: 1 },
    price_low: { priceForTwo: 1 },
    price_high: { priceForTwo: -1 },
    relevance: {},
  };

  const query = Restaurant.find(filter)
    .skip((q.page - 1) * q.limit)
    .limit(q.limit);
  const sort = sortMap[q.sort];
  if (Object.keys(sort).length > 0) query.sort(sort);

  const [items, total] = await Promise.all([
    query.lean(),
    Restaurant.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: { items, total, page: q.page, hasMore: q.page * q.limit < total },
  });
};

export const getRestaurant = async (req: Request, res: Response) => {
  const restaurant = await Restaurant.findById(req.params.id).lean();
  if (!restaurant || !restaurant.isActive) throw ApiError.notFound('Restaurant not found');
  res.json({ success: true, data: restaurant });
};

export const getMenu = async (req: Request, res: Response) => {
  const items = await MenuItem.find({ restaurant: req.params.id, isAvailable: true })
    .sort({ section: 1, isBestseller: -1 })
    .lean();

  // Group by menu section so the app can render section headers directly.
  const sections = new Map<string, typeof items>();
  for (const item of items) {
    const list = sections.get(item.section) ?? [];
    list.push(item);
    sections.set(item.section, list);
  }
  res.json({
    success: true,
    data: [...sections.entries()].map(([title, data]) => ({ title, items: data })),
  });
};

export const getRestaurantReviews = async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = 20;
  const reviews = await Review.find({ restaurant: req.params.id })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('user', 'name avatarUrl')
    .lean();
  res.json({ success: true, data: reviews });
};

export const listCategories = async (_req: Request, res: Response) => {
  const categories = await Category.find({ isActive: true }).sort({ sortOrder: 1 }).lean();
  res.json({ success: true, data: categories });
};
