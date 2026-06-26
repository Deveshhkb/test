import 'dotenv/config';
import mongoose from 'mongoose';
import slugify from 'slugify';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import Category from '../models/Category.js';
import Brand from '../models/Brand.js';
import Product from '../models/Product.js';
import Banner from '../models/Banner.js';
import Coupon from '../models/Coupon.js';
import CmsPage from '../models/CmsPage.js';

// Original, royalty-free Unsplash apparel imagery (no third-party branding).
const img = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=800&q=70`;

const CATEGORIES = [
  { name: 'Men', slug: 'men', isFeatured: true, image: img('1490578474895-699cd4e2cf59') },
  { name: 'Women', slug: 'women', isFeatured: true, image: img('1483985988355-763728e1935b') },
  { name: 'Accessories', slug: 'accessories', isFeatured: true, image: img('1523275335684-37898b6baf30') },
  { name: 'Footwear', slug: 'footwear', isFeatured: true, image: img('1542291026-7eec264c27ff') },
];

const BRANDS = [
  { name: 'NovaBasics', slug: 'novabasics' },
  { name: 'Urban Aura', slug: 'urban-aura' },
  { name: 'Trailhead', slug: 'trailhead' },
  { name: 'Lumen Co', slug: 'lumen-co' },
];

const COLORS = [
  { name: 'Black', hex: '#111111' },
  { name: 'White', hex: '#f5f5f5' },
  { name: 'Navy', hex: '#1f2a44' },
  { name: 'Olive', hex: '#5b6043' },
  { name: 'Maroon', hex: '#5e1f2e' },
];
const SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

const PRODUCT_BLUEPRINTS = [
  { title: 'Oversized Graphic Tee', gender: 'unisex', cat: 'men', price: 799, mrp: 1299, img: '1521572163474-6864f9cf17ab', collections: ['trending', 'new-arrivals'] },
  { title: 'Relaxed Fit Hoodie', gender: 'unisex', cat: 'men', price: 1499, mrp: 2499, img: '1556821840-3a63f95609a7', collections: ['best-sellers'] },
  { title: 'Slim Stretch Chinos', gender: 'men', cat: 'men', price: 1799, mrp: 2999, img: '1473966968600-fa801b869a1a', collections: ['trending'] },
  { title: 'Floral Wrap Dress', gender: 'women', cat: 'women', price: 1999, mrp: 3499, img: '1572804013309-59a88b7e92f1', collections: ['new-arrivals', 'trending'] },
  { title: 'High-Rise Mom Jeans', gender: 'women', cat: 'women', price: 1899, mrp: 2999, img: '1541099649105-f69ad21f3246', collections: ['best-sellers'] },
  { title: 'Ribbed Knit Crop Top', gender: 'women', cat: 'women', price: 899, mrp: 1499, img: '1525507119028-ed4c629a60a3', collections: ['trending'] },
  { title: 'Canvas Low-Top Sneakers', gender: 'unisex', cat: 'footwear', price: 2299, mrp: 3499, img: '1525966222134-fcfa99b8ae77', collections: ['best-sellers', 'trending'] },
  { title: 'Trail Running Shoes', gender: 'unisex', cat: 'footwear', price: 3499, mrp: 4999, img: '1542291026-7eec264c27ff', collections: ['new-arrivals'] },
  { title: 'Minimalist Leather Watch', gender: 'unisex', cat: 'accessories', price: 2999, mrp: 4999, img: '1524805444758-089113d48a6d', collections: ['trending'] },
  { title: 'Everyday Canvas Backpack', gender: 'unisex', cat: 'accessories', price: 1699, mrp: 2499, img: '1553062407-98eeb64c6a62', collections: ['best-sellers'] },
  { title: 'Classic Aviator Sunglasses', gender: 'unisex', cat: 'accessories', price: 1299, mrp: 1999, img: '1572635196237-14b3f281503f', collections: ['new-arrivals'] },
  { title: 'Linen Button-Down Shirt', gender: 'men', cat: 'men', price: 1599, mrp: 2299, img: '1596755094514-f87e34085b2c', collections: ['new-arrivals', 'best-sellers'] },
];

const makeVariants = (base, prefix) => {
  const variants = [];
  COLORS.slice(0, 3).forEach((c, ci) => {
    SIZES.slice(0, 4).forEach((s, si) => {
      variants.push({
        sku: `${prefix}-${c.name.slice(0, 2).toUpperCase()}-${s}`,
        color: c.name,
        colorHex: c.hex,
        size: s,
        stock: 5 + ((ci + si) % 7) * 4,
      });
    });
  });
  return variants;
};

const run = async () => {
  await connectDB();
  console.log('🌱 Seeding database...');

  await Promise.all([
    User.deleteMany({}),
    Category.deleteMany({}),
    Brand.deleteMany({}),
    Product.deleteMany({}),
    Banner.deleteMany({}),
    Coupon.deleteMany({}),
    CmsPage.deleteMany({}),
  ]);

  // Users
  await User.create({
    name: 'Nova Admin',
    email: 'admin@novastyle.test',
    password: 'admin123',
    role: 'admin',
    emailVerified: true,
  });
  await User.create({
    name: 'Demo Customer',
    email: 'customer@novastyle.test',
    password: 'customer123',
    emailVerified: true,
  });

  const categories = await Category.insertMany(CATEGORIES);
  const brands = await Brand.insertMany(BRANDS);
  const catBySlug = Object.fromEntries(categories.map((c) => [c.slug, c]));

  const products = PRODUCT_BLUEPRINTS.map((p, idx) => {
    const prefix = `NS${String(idx + 1).padStart(3, '0')}`;
    return {
      title: p.title,
      slug: slugify(p.title, { lower: true, strict: true }),
      description: `${p.title} crafted from premium, breathable fabric for all-day comfort. Designed in-house by the NovaStyle studio with a modern, versatile silhouette.`,
      specifications: { Fabric: 'Premium cotton blend', Fit: 'Regular', Care: 'Machine wash cold', Origin: 'Made in India' },
      category: catBySlug[p.cat]._id,
      brand: brands[idx % brands.length]._id,
      gender: p.gender,
      price: p.price,
      compareAtPrice: p.mrp,
      images: [img(p.img), img(p.img)],
      colors: COLORS.slice(0, 3),
      sizes: SIZES.slice(0, 4),
      variants: makeVariants(p, prefix),
      tags: [p.cat, p.gender, 'fashion'],
      collections: p.collections,
      isFeatured: idx < 4,
      ratingAverage: 4 + ((idx % 10) / 10),
      ratingCount: 12 + idx * 3,
      soldCount: 50 + idx * 11,
      metaTitle: `${p.title} | NovaStyle`,
      metaDescription: `Shop the ${p.title} at NovaStyle. Free shipping over ₹999.`,
    };
  });
  await Product.insertMany(products);

  await Banner.insertMany([
    { title: 'The Summer Edit', subtitle: 'Up to 50% off new-season styles', image: img('1483985988355-763728e1935b'), placement: 'hero', order: 1, link: '/collections/new-arrivals' },
    { title: 'Street Staples', subtitle: 'Hoodies, tees & more', image: img('1521572163474-6864f9cf17ab'), placement: 'hero', order: 2, link: '/men' },
    { title: 'Flat ₹500 Off', subtitle: 'On your first order over ₹1499', image: img('1556821840-3a63f95609a7'), placement: 'promo', order: 1, link: '/collections/best-sellers' },
    { title: 'Footwear Fest', subtitle: 'Sneakers from ₹1999', image: img('1542291026-7eec264c27ff'), placement: 'offer', order: 1, link: '/footwear' },
  ]);

  await Coupon.insertMany([
    { code: 'NOVA10', type: 'percent', value: 10, minOrderValue: 999, maxDiscount: 300, description: '10% off over ₹999' },
    { code: 'FIRST500', type: 'flat', value: 500, minOrderValue: 1499, description: '₹500 off your first order' },
    { code: 'FREESHIP', type: 'flat', value: 49, minOrderValue: 0, description: 'Free shipping' },
  ]);

  await CmsPage.insertMany([
    { title: 'About NovaStyle', slug: 'about', content: '<p>NovaStyle is an original fashion label building comfortable, expressive everyday wear.</p>' },
    { title: 'Shipping & Returns', slug: 'shipping-returns', content: '<p>Free shipping over ₹999. Easy 7-day returns.</p>' },
    { title: 'Privacy Policy', slug: 'privacy', content: '<p>We respect your privacy. This is placeholder policy content.</p>' },
    { title: 'Terms of Service', slug: 'terms', content: '<p>Placeholder terms of service.</p>' },
  ]);

  console.log('✅ Seed complete.');
  console.log('   Admin:    admin@novastyle.test / admin123');
  console.log('   Customer: customer@novastyle.test / customer123');
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
