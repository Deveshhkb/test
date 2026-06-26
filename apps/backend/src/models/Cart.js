import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: mongoose.Schema.Types.ObjectId, default: null },
    sku: { type: String, default: '' },
    color: { type: String, default: '' },
    size: { type: String, default: '' },
    quantity: { type: Number, default: 1, min: 1 },
    price: { type: Number, required: true }, // unit price snapshot
  },
  { _id: true }
);

const cartSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: [cartItemSchema],
    coupon: {
      code: { type: String, default: '' },
      discount: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

export default mongoose.model('Cart', cartSchema);
