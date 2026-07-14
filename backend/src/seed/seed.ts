/**
 * Development seeder: categories, restaurants, menus, and coupons for Bengaluru.
 * Run with `npm run seed` — wipes and repopulates catalog collections only
 * (users, orders, and reviews are left untouched).
 */
import { connectDB, disconnectDB } from '../config/db';
import { Category } from '../models/Category';
import { Restaurant } from '../models/Restaurant';
import { MenuItem } from '../models/MenuItem';
import { Coupon } from '../models/Coupon';

const img = (id: string) => `https://images.unsplash.com/${id}?w=800&q=70`;

const categories = [
  { name: 'Pizza', slug: 'pizza', imageUrl: img('photo-1565299624946-b28f40a0ae38'), sortOrder: 1 },
  { name: 'Biryani', slug: 'biryani', imageUrl: img('photo-1563379091339-03b21ab4a4f8'), sortOrder: 2 },
  { name: 'Burgers', slug: 'burgers', imageUrl: img('photo-1568901346375-23c9450c58cd'), sortOrder: 3 },
  { name: 'Sushi', slug: 'sushi', imageUrl: img('photo-1579584425555-c3ce17fd4351'), sortOrder: 4 },
  { name: 'Desserts', slug: 'desserts', imageUrl: img('photo-1551024506-0bccd828d307'), sortOrder: 5 },
  { name: 'Healthy', slug: 'healthy', imageUrl: img('photo-1512621776951-a57141f2eefd'), sortOrder: 6 },
  { name: 'South Indian', slug: 'south-indian', imageUrl: img('photo-1630383249896-424e482df921'), sortOrder: 7 },
  { name: 'Chinese', slug: 'chinese', imageUrl: img('photo-1585032226651-759b368d7246'), sortOrder: 8 },
];

// Bengaluru coordinates, [lng, lat]
const restaurants = [
  {
    name: 'Ember & Oak', slug: 'ember-and-oak',
    description: 'Wood-fired pizzas and slow roasts from a chef-led kitchen.',
    cuisines: ['Italian', 'Continental'], categorySlugs: ['pizza'],
    coverImageUrl: img('photo-1513104890138-7c749659a591'),
    address: '12 Lavelle Road, Bengaluru', location: { type: 'Point', coordinates: [77.5993, 12.9698] },
    priceForTwo: 900, rating: 4.6, ratingCount: 2140, deliveryTimeMins: 28, deliveryFee: 35,
    tags: ['wood-fired', 'date night'],
    menu: [
      { section: 'Wood-Fired Pizzas', name: 'Margherita di Bufala', basePrice: 399, isVeg: true, isBestseller: true, description: 'San Marzano tomatoes, buffalo mozzarella, basil.', variants: [{ name: 'Regular 10"', price: 399 }, { name: 'Large 13"', price: 599 }], addOns: [{ name: 'Extra mozzarella', price: 79 }, { name: 'Truffle oil drizzle', price: 99 }] },
      { section: 'Wood-Fired Pizzas', name: 'Smoked Pepperoni', basePrice: 499, isVeg: false, description: 'House-smoked pepperoni, chilli honey.', variants: [{ name: 'Regular 10"', price: 499 }, { name: 'Large 13"', price: 749 }], addOns: [{ name: 'Extra pepperoni', price: 119 }] },
      { section: 'Roasts', name: 'Slow Roast Chicken', basePrice: 549, isVeg: false, spiceLevel: 'mild', description: 'Half bird, rosemary jus, roast potatoes.' },
      { section: 'Desserts', name: 'Basque Cheesecake', basePrice: 249, isVeg: true, isBestseller: true },
    ],
  },
  {
    name: 'Dum Pukht House', slug: 'dum-pukht-house',
    description: 'Handi biryanis sealed and slow-cooked the Awadhi way.',
    cuisines: ['North Indian', 'Mughlai'], categorySlugs: ['biryani'],
    coverImageUrl: img('photo-1589302168068-964664d93dc0'),
    address: '4 Frazer Town, Bengaluru', location: { type: 'Point', coordinates: [77.6134, 12.9985] },
    priceForTwo: 600, rating: 4.4, ratingCount: 5320, deliveryTimeMins: 34, deliveryFee: 29,
    tags: ['biryani', 'family'],
    menu: [
      { section: 'Biryani', name: 'Chicken Dum Biryani', basePrice: 329, isVeg: false, isBestseller: true, spiceLevel: 'medium', variants: [{ name: 'Serves 1', price: 329 }, { name: 'Serves 2', price: 599 }], addOns: [{ name: 'Extra raita', price: 39 }, { name: 'Boiled egg', price: 25 }] },
      { section: 'Biryani', name: 'Subz Handi Biryani', basePrice: 279, isVeg: true, spiceLevel: 'medium' },
      { section: 'Kebabs', name: 'Galouti Kebab', basePrice: 349, isVeg: false, spiceLevel: 'mild', isBestseller: true },
      { section: 'Breads', name: 'Sheermal', basePrice: 79, isVeg: true },
    ],
  },
  {
    name: 'Stackhouse Burgers', slug: 'stackhouse-burgers',
    description: 'Smash patties, brioche buns, secret sauce.',
    cuisines: ['American', 'Fast Food'], categorySlugs: ['burgers'],
    coverImageUrl: img('photo-1571091718767-18b5b1457add'),
    address: '88 Indiranagar 100ft Rd, Bengaluru', location: { type: 'Point', coordinates: [77.6408, 12.9784] },
    priceForTwo: 500, rating: 4.3, ratingCount: 3410, deliveryTimeMins: 22, deliveryFee: 25,
    tags: ['late night', 'quick bites'],
    menu: [
      { section: 'Smash Burgers', name: 'Double Smash Classic', basePrice: 289, isVeg: false, isBestseller: true, addOns: [{ name: 'Bacon jam', price: 69 }, { name: 'Extra patty', price: 99 }, { name: 'Cheese slice', price: 39 }] },
      { section: 'Smash Burgers', name: 'Shroom & Swiss (Veg)', basePrice: 249, isVeg: true },
      { section: 'Sides', name: 'Loaded Fries', basePrice: 189, isVeg: true, isBestseller: true },
      { section: 'Shakes', name: 'Salted Caramel Shake', basePrice: 199, isVeg: true },
    ],
  },
  {
    name: 'Kaze Sushi Bar', slug: 'kaze-sushi-bar',
    description: 'Precision sushi with daily air-flown fish.',
    cuisines: ['Japanese'], categorySlugs: ['sushi', 'healthy'],
    coverImageUrl: img('photo-1553621042-f6e147245754'),
    address: '2 UB City, Bengaluru', location: { type: 'Point', coordinates: [77.5946, 12.9719] },
    priceForTwo: 1600, rating: 4.8, ratingCount: 890, deliveryTimeMins: 40, deliveryFee: 49,
    isVegOnly: false, tags: ['premium', 'sushi'],
    menu: [
      { section: 'Nigiri', name: 'Salmon Nigiri (4 pc)', basePrice: 549, isVeg: false, isBestseller: true },
      { section: 'Rolls', name: 'Spicy Tuna Roll', basePrice: 649, isVeg: false, spiceLevel: 'hot' },
      { section: 'Rolls', name: 'Avocado Cucumber Roll', basePrice: 449, isVeg: true },
      { section: 'Bowls', name: 'Salmon Poke Bowl', basePrice: 699, isVeg: false, calories: 520 },
    ],
  },
  {
    name: 'Velvet Whisk', slug: 'velvet-whisk',
    description: 'Artisan patisserie — entremets, tarts and single-origin hot chocolate.',
    cuisines: ['Desserts', 'Bakery'], categorySlugs: ['desserts'],
    coverImageUrl: img('photo-1488477181946-6428a0291777'),
    address: '31 Koramangala 5th Block, Bengaluru', location: { type: 'Point', coordinates: [77.6229, 12.9352] },
    priceForTwo: 450, rating: 4.7, ratingCount: 1275, deliveryTimeMins: 25, deliveryFee: 30,
    isVegOnly: true, tags: ['dessert', 'gifting'],
    menu: [
      { section: 'Entremets', name: 'Dark Chocolate Hazelnut', basePrice: 325, isVeg: true, isBestseller: true },
      { section: 'Tarts', name: 'Burnt Basque Tart', basePrice: 275, isVeg: true },
      { section: 'Beverages', name: 'Single-Origin Hot Chocolate', basePrice: 225, isVeg: true },
    ],
  },
  {
    name: 'Prana Bowl Co.', slug: 'prana-bowl-co',
    description: 'Macro-balanced bowls, cold-pressed juices, zero seed oils.',
    cuisines: ['Healthy', 'Salads'], categorySlugs: ['healthy'],
    coverImageUrl: img('photo-1546069901-ba9599a7e63c'),
    address: '7 HSR Layout, Bengaluru', location: { type: 'Point', coordinates: [77.6446, 12.9121] },
    priceForTwo: 550, rating: 4.5, ratingCount: 980, deliveryTimeMins: 26, deliveryFee: 25,
    isVegOnly: false, tags: ['healthy', 'protein'],
    menu: [
      { section: 'Signature Bowls', name: 'Grilled Chicken Macro Bowl', basePrice: 349, isVeg: false, isBestseller: true, calories: 610, addOns: [{ name: 'Extra chicken 100g', price: 119 }, { name: 'Avocado', price: 89 }] },
      { section: 'Signature Bowls', name: 'Paneer Tikka Quinoa Bowl', basePrice: 319, isVeg: true, calories: 540 },
      { section: 'Juices', name: 'Cold-Pressed Green Detox', basePrice: 179, isVeg: true },
    ],
  },
  {
    name: 'Dosa Katte', slug: 'dosa-katte',
    description: 'Benne dosas on cast iron, filter coffee in davara sets.',
    cuisines: ['South Indian'], categorySlugs: ['south-indian'],
    coverImageUrl: img('photo-1668236543090-82eba5ee5976'),
    address: '19 Basavanagudi, Bengaluru', location: { type: 'Point', coordinates: [77.5738, 12.9420] },
    priceForTwo: 250, rating: 4.5, ratingCount: 7150, deliveryTimeMins: 20, deliveryFee: 19,
    isVegOnly: true, tags: ['breakfast', 'value'],
    menu: [
      { section: 'Dosas', name: 'Benne Masala Dosa', basePrice: 129, isVeg: true, isBestseller: true, addOns: [{ name: 'Extra benne (butter)', price: 25 }, { name: 'Podi sprinkle', price: 20 }] },
      { section: 'Dosas', name: 'Ghee Podi Dosa', basePrice: 149, isVeg: true },
      { section: 'Idli & Vada', name: 'Thatte Idli (2 pc)', basePrice: 79, isVeg: true },
      { section: 'Beverages', name: 'Filter Coffee', basePrice: 49, isVeg: true, isBestseller: true },
    ],
  },
  {
    name: 'Wok Theory', slug: 'wok-theory',
    description: 'High-heat Cantonese wok classics and dim sum.',
    cuisines: ['Chinese', 'Asian'], categorySlugs: ['chinese'],
    coverImageUrl: img('photo-1525755662778-989d0524087e'),
    address: '52 Whitefield Main Rd, Bengaluru', location: { type: 'Point', coordinates: [77.7500, 12.9698] },
    priceForTwo: 700, rating: 4.2, ratingCount: 2890, deliveryTimeMins: 32, deliveryFee: 39,
    tags: ['dim sum', 'group order'],
    menu: [
      { section: 'Dim Sum', name: 'Prawn Har Gow (6 pc)', basePrice: 329, isVeg: false, isBestseller: true },
      { section: 'Dim Sum', name: 'Crystal Veg Dumplings (6 pc)', basePrice: 269, isVeg: true },
      { section: 'Wok', name: 'Kung Pao Chicken', basePrice: 389, isVeg: false, spiceLevel: 'hot', variants: [{ name: 'Regular', price: 389 }, { name: 'Family', price: 649 }] },
      { section: 'Rice & Noodles', name: 'Burnt Garlic Fried Rice', basePrice: 249, isVeg: true },
    ],
  },
];

const coupons = [
  { code: 'SAVORA50', title: '50% off your first order', discountType: 'percent', discountValue: 50, maxDiscount: 120, minOrderAmount: 199, validUntil: new Date(Date.now() + 90 * 24 * 3600_000), usageLimitPerUser: 1 },
  { code: 'FEAST100', title: '₹100 off on ₹499+', discountType: 'flat', discountValue: 100, minOrderAmount: 499, validUntil: new Date(Date.now() + 30 * 24 * 3600_000), usageLimitPerUser: 3 },
  { code: 'WEEKEND20', title: '20% off weekend feasts', discountType: 'percent', discountValue: 20, maxDiscount: 150, minOrderAmount: 299, validUntil: new Date(Date.now() + 60 * 24 * 3600_000), usageLimitPerUser: 10 },
];

const run = async () => {
  await connectDB();
  await Promise.all([
    Category.deleteMany({}), Restaurant.deleteMany({}),
    MenuItem.deleteMany({}), Coupon.deleteMany({}),
  ]);

  const cats = await Category.insertMany(categories);
  const catBySlug = new Map(cats.map((c) => [c.slug, c._id]));

  for (const { menu, categorySlugs, ...rest } of restaurants) {
    const restaurant = await Restaurant.create({
      ...rest,
      categories: categorySlugs.map((s) => catBySlug.get(s)).filter(Boolean),
      openingHours: Array.from({ length: 7 }, (_, day) => ({ day, open: '09:00', close: '23:30' })),
    });
    await MenuItem.insertMany(menu.map((m) => ({ ...m, restaurant: restaurant._id })));
  }

  await Coupon.insertMany(coupons);
  console.log(`[seed] ${cats.length} categories, ${restaurants.length} restaurants, ${coupons.length} coupons ✓`);
  await disconnectDB();
};

run().catch((err) => { console.error(err); process.exit(1); });
