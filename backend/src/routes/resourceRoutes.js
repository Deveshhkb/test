import express from 'express';
import { crudFactory } from '../controllers/crudFactory.js';
import { protect, adminOnly } from '../middleware/auth.js';

/**
 * Builds a router exposing public read endpoints and admin-only write endpoints.
 *   GET    /            list
 *   GET    /:id         get by id or slug
 *   POST   /            create  (admin)
 *   PUT    /:id         update  (admin)
 *   DELETE /:id         delete  (admin)
 */
export const buildResourceRouter = (Model, options) => {
  const router = express.Router();
  const c = crudFactory(Model, options);

  router.route('/').get(c.list).post(protect, adminOnly, c.create);
  router.route('/:id').get(c.getOne).put(protect, adminOnly, c.update).delete(protect, adminOnly, c.remove);

  return router;
};
