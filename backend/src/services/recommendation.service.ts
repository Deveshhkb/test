import { Types } from 'mongoose';
import { Order } from '../models/Order';
import { Restaurant } from '../models/Restaurant';
import { MenuItem } from '../models/MenuItem';

/**
 * Lightweight on-database recommendation engine:
 *  1. Profile the user's cuisine affinity from their order history.
 *  2. Score restaurants by cuisine overlap × rating, excluding recently ordered ones.
 *  3. Cold start → trending (top-rated, most-reviewed) restaurants.
 *
 * The scoring is deliberately explainable ("Because you love Italian") and can be
 * swapped for an embedding-based ranker behind the same interface later.
 */
export const recommendForUser = async (userId: string, limit = 10) => {
  const recentOrders = await Order.find({ user: userId, status: 'delivered' })
    .sort({ createdAt: -1 })
    .limit(30)
    .select('restaurant items')
    .lean();

  if (recentOrders.length === 0) return trending(limit);

  const restaurantIds = [...new Set(recentOrders.map((o) => o.restaurant.toString()))];
  const orderedFrom = await Restaurant.find({ _id: { $in: restaurantIds } })
    .select('cuisines')
    .lean();

  const affinity = new Map<string, number>();
  for (const r of orderedFrom) {
    for (const cuisine of r.cuisines) {
      affinity.set(cuisine, (affinity.get(cuisine) ?? 0) + 1);
    }
  }
  const topCuisines = [...affinity.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([cuisine]) => cuisine);

  const candidates = await Restaurant.find({
    isActive: true,
    cuisines: { $in: topCuisines },
    _id: { $nin: restaurantIds.slice(0, 3).map((id) => new Types.ObjectId(id)) },
  })
    .sort({ rating: -1, ratingCount: -1 })
    .limit(limit * 2)
    .lean();

  const scored = candidates
    .map((r) => ({
      ...r,
      _score:
        r.cuisines.reduce((s, c) => s + (affinity.get(c) ?? 0), 0) * 2 +
        r.rating * Math.log10(r.ratingCount + 1),
      _reason: `Because you enjoy ${r.cuisines.find((c) => topCuisines.includes(c)) ?? r.cuisines[0]}`,
    }))
    .sort((a, b) => b._score - a._score)
    .slice(0, limit);

  return scored.length > 0 ? scored : trending(limit);
};

/** "People also ordered" — items frequently co-ordered with the ones in the cart. */
export const alsoOrderedWith = async (menuItemIds: string[], limit = 6) => {
  const coOrders = await Order.aggregate([
    { $match: { 'items.menuItem': { $in: menuItemIds.map((id) => new Types.ObjectId(id)) } } },
    { $unwind: '$items' },
    { $match: { 'items.menuItem': { $nin: menuItemIds.map((id) => new Types.ObjectId(id)) } } },
    { $group: { _id: '$items.menuItem', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit },
  ]);
  return MenuItem.find({
    _id: { $in: coOrders.map((c) => c._id) },
    isAvailable: true,
  }).lean();
};

const trending = (limit: number) =>
  Restaurant.find({ isActive: true })
    .sort({ rating: -1, ratingCount: -1 })
    .limit(limit)
    .lean()
    .then((items) => items.map((r) => ({ ...r, _reason: 'Trending near you' })));
