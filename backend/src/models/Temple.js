import mongoose from 'mongoose';
import slugify from 'slugify';
import { localizedString } from '../utils/localized.js';

const templeSchema = new mongoose.Schema(
  {
    name: { ...localizedString() },
    slug: { type: String, unique: true, index: true },
    destination: { type: mongoose.Schema.Types.ObjectId, ref: 'Destination' },
    category: {
      type: String,
      enum: ['Ram Temple', 'Shiva Temple', 'Krishna Temple', 'Devi Temple', 'Hanuman Temple', 'Other'],
      default: 'Other',
    },
    description: { ...localizedString() },
    history: { ...localizedString() },
    darshanTimings: { type: String, default: '' },
    aartiTimings: { type: String, default: '' },
    dressCode: { ...localizedString() },
    coverImage: { type: String, required: true },
    gallery: [{ type: String }],
    location: { lat: Number, lng: Number, address: String },
    nearbyAttractions: [
      {
        name: String,
        distance: String,
        _id: false,
      },
    ],
    featured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

templeSchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.slug = slugify(this.name.en || 'temple', { lower: true, strict: true });
  }
  next();
});

const Temple = mongoose.model('Temple', templeSchema);
export default Temple;
