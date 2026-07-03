import { Router } from 'express';
import authRoutes from './authRoutes.js';
import productRoutes from './productRoutes.js';
import categoryRoutes from './categoryRoutes.js';
import cartRoutes from './cartRoutes.js';
import wishlistRoutes from './wishlistRoutes.js';
import orderRoutes from './orderRoutes.js';
import reviewRoutes from './reviewRoutes.js';
import couponRoutes from './couponRoutes.js';
import bannerRoutes from './bannerRoutes.js';
import addressRoutes from './addressRoutes.js';
import uploadRoutes from './uploadRoutes.js';
import adminRoutes from './adminRoutes.js';
import cmsRoutes from './cmsRoutes.js';
import aiRoutes from './aiRoutes.js';
import cardRoutes from './cardRoutes.js';

const router = Router();

router.get('/health', (req, res) => res.json({ success: true, status: 'ok', time: new Date() }));

router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/catalog', categoryRoutes); // /catalog/categories, /catalog/brands
router.use('/cart', cartRoutes);
router.use('/wishlist', wishlistRoutes);
router.use('/orders', orderRoutes);
router.use('/reviews', reviewRoutes);
router.use('/coupons', couponRoutes);
router.use('/banners', bannerRoutes);
router.use('/addresses', addressRoutes);
router.use('/upload', uploadRoutes);
router.use('/admin', adminRoutes);
router.use('/cms', cmsRoutes);
router.use('/ai', aiRoutes);
router.use('/cards', cardRoutes);

export default router;
