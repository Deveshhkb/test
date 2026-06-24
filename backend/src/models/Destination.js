import mongoose from 'mongoose';
import slugify from 'slugify';

/**
 * A localized string stores translations keyed by language code.
 * Frontend falls back to `en` when a translation is missing.
 */
const localized = () => ({
  en: { type: String, default: '' },
  hi: { type: String, default: '' },
  gu: { type: String, default: '' },
  mr: { type: String, default: '' },
  bn: { type: String, default: '' },
  ta: { type: String, default: '' },
  te: { type: String, default: '' },
  kn: { type: String, default: '' },
});

const destinationSchema = new mongoose.Schema(
  {
    name: { ...localized(), _id: false },
    slug: { type: String, unique: true, index: true },
    state: { type: String, default: 'Uttar Pradesh' },
    shortDescription: { ...localized(), _id: false },
    description: { ...localized(), _id: false },
    coverImage: { type: String, required: true },
    gallery: [{ type: String }],
    location: {
      lat: Number,
      lng: Number,
      address: String,
    },
    highlights: [{ type: String }],
    bestTimeToVisit: { type: String, default: '' },
    templeCount: { type: Number, default: 0 },
    featured: { type: Boolean, default: false },
    rating: { type: Number, default: 4.7 },
  },
  { timestamps: true }
);

destinationSchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.slug = slugify(this.name.en || 'destination', { lower: true, strict: true });
  }
  next();
});

const Destination = mongoose.model('Destination', destinationSchema);
export default Destination;
