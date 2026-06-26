import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, default: '' },
    type: { type: String, enum: ['percent', 'flat'], default: 'percent' },
    value: { type: Number, required: true, min: 0 },
    minOrderValue: { type: Number, default: 0 },
    maxDiscount: { type: Number, default: 0 }, // cap for percent coupons (0 = no cap)
    usageLimit: { type: Number, default: 0 }, // 0 = unlimited
    usedCount: { type: Number, default: 0 },
    expiresAt: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

/** Returns { valid, discount, message } for a given cart subtotal. */
couponSchema.methods.evaluate = function evaluate(subtotal) {
  if (!this.isActive) return { valid: false, discount: 0, message: 'Coupon is inactive.' };
  if (this.expiresAt && this.expiresAt < new Date())
    return { valid: false, discount: 0, message: 'Coupon has expired.' };
  if (this.usageLimit && this.usedCount >= this.usageLimit)
    return { valid: false, discount: 0, message: 'Coupon usage limit reached.' };
  if (subtotal < this.minOrderValue)
    return {
      valid: false,
      discount: 0,
      message: `Minimum order of ₹${this.minOrderValue} required.`,
    };

  let discount =
    this.type === 'percent' ? Math.round((subtotal * this.value) / 100) : this.value;
  if (this.type === 'percent' && this.maxDiscount > 0) {
    discount = Math.min(discount, this.maxDiscount);
  }
  discount = Math.min(discount, subtotal);
  return { valid: true, discount, message: 'Coupon applied.' };
};

export default mongoose.model('Coupon', couponSchema);
