import mongoose from 'mongoose';
import slugify from 'slugify';
import { localizedString } from '../utils/localized.js';

const hotelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, unique: true, index: true },
    destination: { type: mongoose.Schema.Types.ObjectId, ref: 'Destination' },
    description: { ...localizedString() },
    coverImage: { type: String, required: true },
    gallery: [{ type: String }],
    pricePerNight: { type: Number, required: true },
    rating: { type: Number, default: 4.5 },
    starCategory: { type: Number, min: 1, max: 5, default: 3 },
    amenities: [{ type: String }], // e.g. WiFi, AC, Parking, Restaurant
    address: { type: String, default: '' },
    location: { lat: Number, lng: Number },
    featured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

hotelSchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

const Hotel = mongoose.model('Hotel', hotelSchema);
export default Hotel;
