import { asyncHandler } from '../middleware/error.js';

/**
 * Generates standard REST handlers for a Mongoose model.
 * Read endpoints are public; create/update/delete are guarded by route middleware.
 *
 * Supports: ?featured=true, ?popular=true, ?category=, ?search=, ?sort=, ?limit=, ?page=
 */
export const crudFactory = (Model, { searchFields = [], populate = [] } = {}) => ({
  list: asyncHandler(async (req, res) => {
    const { featured, popular, category, search, sort, limit = 50, page = 1, destination } = req.query;
    const query = {};

    if (featured !== undefined) query.featured = featured === 'true';
    if (popular !== undefined) query.popular = popular === 'true';
    if (category) query.category = category;
    if (destination) query.destination = destination;

    if (search && searchFields.length) {
      query.$or = searchFields.map((field) => ({ [field]: { $regex: search, $options: 'i' } }));
    }

    let sortObj = { createdAt: -1 };
    if (sort === 'price_asc') sortObj = { price: 1, pricePerNight: 1 };
    if (sort === 'price_desc') sortObj = { price: -1, pricePerNight: -1 };
    if (sort === 'rating') sortObj = { rating: -1 };

    const perPage = Math.min(Number(limit), 100);
    const skip = (Number(page) - 1) * perPage;

    let q = Model.find(query).sort(sortObj).skip(skip).limit(perPage);
    populate.forEach((p) => (q = q.populate(p)));

    const [items, total] = await Promise.all([q, Model.countDocuments(query)]);
    res.json({ success: true, count: items.length, total, page: Number(page), data: items });
  }),

  getOne: asyncHandler(async (req, res) => {
    const byId = req.params.id.match(/^[0-9a-fA-F]{24}$/);
    let q = byId ? Model.findById(req.params.id) : Model.findOne({ slug: req.params.id });
    populate.forEach((p) => (q = q.populate(p)));
    const item = await q;
    if (!item) {
      res.status(404);
      throw new Error('Resource not found');
    }
    res.json({ success: true, data: item });
  }),

  create: asyncHandler(async (req, res) => {
    const item = await Model.create(req.body);
    res.status(201).json({ success: true, data: item });
  }),

  update: asyncHandler(async (req, res) => {
    const item = await Model.findById(req.params.id);
    if (!item) {
      res.status(404);
      throw new Error('Resource not found');
    }
    Object.assign(item, req.body);
    await item.save(); // keeps pre-save hooks (slug regen) working
    res.json({ success: true, data: item });
  }),

  remove: asyncHandler(async (req, res) => {
    const item = await Model.findByIdAndDelete(req.params.id);
    if (!item) {
      res.status(404);
      throw new Error('Resource not found');
    }
    res.json({ success: true, message: 'Deleted' });
  }),
});
