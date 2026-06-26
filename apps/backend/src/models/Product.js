import mongoose from 'mongoose';

/**
 * A product variant is a unique sellable combination (color + size)
 * with its own SKU, price override and stock count.
 */
const variantSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true, trim: true },
    color: { type: String, default: '' },
    colorHex: { type: String, default: '' },
    size: { type: String, default: '' },
    price: { type: Number, min: 0 }, // optional override of base price
    stock: { type: Number, default: 0, min: 0 },
    image: { type: String, default: '' },
  },
  { _id: true }
);

const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, default: '' },
    specifications: { type: Map, of: String, default: {} },

    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand' },
    gender: { type: String, enum: ['men', 'women', 'unisex', 'kids'], default: 'unisex' },

    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, min: 0 }, // original/MRP for discount display
    currency: { type: String, default: 'INR' },

    images: [{ type: String }],
    colors: [{ name: String, hex: String }],
    sizes: [{ type: String }],
    variants: [variantSchema],

    tags: [{ type: String }],
    collections: [{ type: String }], // e.g. "trending", "new-arrivals", "best-sellers"

    ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0 },
    soldCount: { type: Number, default: 0 },

    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },

    // SEO
    metaTitle: { type: String, default: '' },
    metaDescription: { type: String, default: '' },
  },
  { timestamps: true }
);

productSchema.virtual('inStock').get(function inStock() {
  if (this.variants?.length) {
    return this.variants.some((v) => v.stock > 0);
  }
  return true;
});

productSchema.virtual('discountPercent').get(function discountPercent() {
  if (this.compareAtPrice && this.compareAtPrice > this.price) {
    return Math.round(((this.compareAtPrice - this.price) / this.compareAtPrice) * 100);
  }
  return 0;
});

productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

productSchema.index({ title: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1, gender: 1, price: 1 });

export default mongoose.model('Product', productSchema);
