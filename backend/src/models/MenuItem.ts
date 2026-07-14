import { Schema, model, Document, Types } from 'mongoose';

export interface IVariant {
  name: string; // e.g. "Regular", "Large"
  price: number;
}

export interface IAddOn {
  name: string; // e.g. "Extra cheese"
  price: number;
}

export interface IMenuItem extends Document {
  restaurant: Types.ObjectId;
  name: string;
  description?: string;
  imageUrl?: string;
  section: string; // menu grouping e.g. "Starters"
  basePrice: number;
  variants: IVariant[];
  addOns: IAddOn[];
  isVeg: boolean;
  isBestseller: boolean;
  isAvailable: boolean;
  spiceLevel?: 'mild' | 'medium' | 'hot';
  calories?: number;
  orderCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const menuItemSchema = new Schema<IMenuItem>(
  {
    restaurant: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: String,
    imageUrl: String,
    section: { type: String, default: 'Recommended' },
    basePrice: { type: Number, required: true, min: 0 },
    variants: [{ name: String, price: Number }],
    addOns: [{ name: String, price: Number }],
    isVeg: { type: Boolean, default: false, index: true },
    isBestseller: { type: Boolean, default: false },
    isAvailable: { type: Boolean, default: true },
    spiceLevel: { type: String, enum: ['mild', 'medium', 'hot'] },
    calories: Number,
    orderCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

menuItemSchema.index({ name: 'text', description: 'text' });

export const MenuItem = model<IMenuItem>('MenuItem', menuItemSchema);
