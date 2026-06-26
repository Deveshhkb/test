import mongoose from 'mongoose';

const bannerSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    subtitle: { type: String, default: '' },
    image: { type: String, required: true },
    mobileImage: { type: String, default: '' },
    ctaText: { type: String, default: 'Shop Now' },
    link: { type: String, default: '/' },
    placement: {
      type: String,
      enum: ['hero', 'promo', 'category', 'offer'],
      default: 'hero',
    },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('Banner', bannerSchema);
