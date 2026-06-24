import express from 'express';
import { buildResourceRouter } from './resourceRoutes.js';

import Destination from '../models/Destination.js';
import Temple from '../models/Temple.js';
import Package from '../models/Package.js';
import Hotel from '../models/Hotel.js';
import Cab from '../models/Cab.js';
import Blog from '../models/Blog.js';
import Gallery from '../models/Gallery.js';
import Testimonial from '../models/Testimonial.js';

import authRoutes from './authRoutes.js';
import bookingRoutes from './bookingRoutes.js';
import enquiryRoutes from './enquiryRoutes.js';
import adminRoutes from './adminRoutes.js';

const router = express.Router();

// Auth & user
router.use('/auth', authRoutes);

// Catalog resources (public read, admin write)
router.use('/destinations', buildResourceRouter(Destination, { searchFields: ['name.en', 'slug'] }));
router.use('/temples', buildResourceRouter(Temple, { searchFields: ['name.en'], populate: ['destination'] }));
router.use('/packages', buildResourceRouter(Package, { searchFields: ['title.en'], populate: ['destinations'] }));
router.use('/hotels', buildResourceRouter(Hotel, { searchFields: ['name'], populate: ['destination'] }));
router.use('/cabs', buildResourceRouter(Cab, { searchFields: ['name', 'vehicleType'] }));
router.use('/blogs', buildResourceRouter(Blog, { searchFields: ['title.en', 'tags'] }));
router.use('/gallery', buildResourceRouter(Gallery, { searchFields: ['title', 'category'] }));
router.use('/testimonials', buildResourceRouter(Testimonial, { searchFields: ['name'] }));

// Transactional
router.use('/bookings', bookingRoutes);
router.use('/enquiries', enquiryRoutes);

// Admin
router.use('/admin', adminRoutes);

export default router;
