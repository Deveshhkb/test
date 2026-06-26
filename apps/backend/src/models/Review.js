import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, default: '' },
    comment: { type: String, default: '' },
    photos: [{ type: String }],
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
    verifiedPurchase: { type: Boolean, default: false },
  },
  { timestamps: true }
);

reviewSchema.index({ product: 1, user: 1 }, { unique: true });

/** Recalculate the parent product's aggregate rating after a review changes. */
reviewSchema.statics.syncProductRating = async function syncProductRating(productId) {
  const Product = mongoose.model('Product');
  const stats = await this.aggregate([
    { $match: { product: productId, status: 'approved' } },
    { $group: { _id: '$product', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  const { avg = 0, count = 0 } = stats[0] || {};
  await Product.findByIdAndUpdate(productId, {
    ratingAverage: Math.round(avg * 10) / 10,
    ratingCount: count,
  });
};

reviewSchema.post('save', function afterSave() {
  this.constructor.syncProductRating(this.product);
});

export default mongoose.model('Review', reviewSchema);
