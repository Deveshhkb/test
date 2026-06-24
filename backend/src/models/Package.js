import mongoose from 'mongoose';
import slugify from 'slugify';
import { localizedString } from '../utils/localized.js';

const itineraryDaySchema = new mongoose.Schema(
  {
    day: Number,
    title: { ...localizedString() },
    description: { ...localizedString() },
  },
  { _id: false }
);

const packageSchema = new mongoose.Schema(
  {
    title: { ...localizedString() },
    slug: { type: String, unique: true, index: true },
    summary: { ...localizedString() },
    description: { ...localizedString() },
    destinations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Destination' }],
    durationDays: { type: Number, required: true },
    durationNights: { type: Number, required: true },
    price: { type: Number, required: true },
    discountPrice: { type: Number },
    coverImage: { type: String, required: true },
    gallery: [{ type: String }],
    inclusions: [{ type: String }],
    exclusions: [{ type: String }],
    hotelInfo: { ...localizedString() },
    vehicleInfo: { ...localizedString() },
    itinerary: [itineraryDaySchema],
    faq: [
      {
        question: { ...localizedString() },
        answer: { ...localizedString() },
        _id: false,
      },
    ],
    rating: { type: Number, default: 4.8 },
    reviewsCount: { type: Number, default: 0 },
    featured: { type: Boolean, default: false },
    popular: { type: Boolean, default: false },
  },
  { timestamps: true }
);

packageSchema.pre('save', function (next) {
  if (this.isModified('title')) {
    this.slug = slugify(this.title.en || 'package', { lower: true, strict: true });
  }
  next();
});

const Package = mongoose.model('Package', packageSchema);
export default Package;
