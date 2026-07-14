import { Schema, model, Document, Types } from 'mongoose';

export interface ICoupon extends Document {
  code: string;
  title: string;
  description?: string;
  discountType: 'percent' | 'flat';
  discountValue: number;
  maxDiscount?: number;
  minOrderAmount: number;
  validFrom: Date;
  validUntil: Date;
  usageLimitPerUser: number;
  totalUsageLimit?: number;
  usedCount: number;
  restaurant?: Types.ObjectId; // null → platform-wide
  isActive: boolean;
}

const couponSchema = new Schema<ICoupon>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    title: { type: String, required: true },
    description: String,
    discountType: { type: String, enum: ['percent', 'flat'], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    maxDiscount: Number,
    minOrderAmount: { type: Number, default: 0 },
    validFrom: { type: Date, default: Date.now },
    validUntil: { type: Date, required: true },
    usageLimitPerUser: { type: Number, default: 1 },
    totalUsageLimit: Number,
    usedCount: { type: Number, default: 0 },
    restaurant: { type: Schema.Types.ObjectId, ref: 'Restaurant' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Coupon = model<ICoupon>('Coupon', couponSchema);
