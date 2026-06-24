import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';

import User from '../models/User.js';
import Destination from '../models/Destination.js';
import Temple from '../models/Temple.js';
import Package from '../models/Package.js';
import Hotel from '../models/Hotel.js';
import Cab from '../models/Cab.js';
import Blog from '../models/Blog.js';
import Gallery from '../models/Gallery.js';
import Testimonial from '../models/Testimonial.js';

import {
  destinations,
  temples,
  packages,
  hotels,
  cabs,
  blogs,
  galleryItems,
  testimonials,
} from './data.js';

const MODELS = [Destination, Temple, Package, Hotel, Cab, Blog, Gallery, Testimonial, User];

const destroy = async () => {
  await Promise.all(MODELS.map((m) => m.deleteMany()));
  console.log('🗑  All collections cleared');
};

const seed = async () => {
  await destroy();

  // Admin user
  await User.create({
    name: process.env.ADMIN_NAME || 'Super Admin',
    email: process.env.ADMIN_EMAIL || 'admin@ayodhyatirtham.com',
    mobile: '9999999999',
    password: process.env.ADMIN_PASSWORD || 'Admin@12345',
    role: 'admin',
    isVerified: true,
  });
  console.log('👤 Admin user created');

  // Destinations (saved individually to trigger slug hook)
  const destDocs = {};
  for (const d of destinations) {
    const doc = new Destination(d);
    await doc.save();
    destDocs[d.name.en] = doc;
  }
  console.log(`📍 ${destinations.length} destinations seeded`);

  // Temples
  for (const t of temples) {
    const { destinationName, ...rest } = t;
    const doc = new Temple({ ...rest, destination: destDocs[destinationName]?._id });
    await doc.save();
  }
  console.log(`🛕 ${temples.length} temples seeded`);

  // Packages
  for (const p of packages) {
    const { destinationNames, ...rest } = p;
    const doc = new Package({
      ...rest,
      destinations: (destinationNames || []).map((n) => destDocs[n]?._id).filter(Boolean),
    });
    await doc.save();
  }
  console.log(`🧳 ${packages.length} packages seeded`);

  // Hotels
  for (const h of hotels) {
    const { destinationName, ...rest } = h;
    const doc = new Hotel({ ...rest, destination: destDocs[destinationName]?._id });
    await doc.save();
  }
  console.log(`🏨 ${hotels.length} hotels seeded`);

  // Cabs
  await Cab.insertMany(cabs);
  console.log(`🚕 ${cabs.length} cabs seeded`);

  // Blogs
  for (const b of blogs) {
    const doc = new Blog(b);
    await doc.save();
  }
  console.log(`📝 ${blogs.length} blogs seeded`);

  // Gallery & testimonials
  await Gallery.insertMany(galleryItems);
  await Testimonial.insertMany(testimonials);
  console.log(`🖼  ${galleryItems.length} gallery items + ${testimonials.length} testimonials seeded`);

  console.log('\n✅ Database seeded successfully!');
};

const run = async () => {
  await connectDB();
  try {
    if (process.argv.includes('--destroy')) {
      await destroy();
    } else {
      await seed();
    }
  } catch (err) {
    console.error('✖ Seeder error:', err);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

run();
