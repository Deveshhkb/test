import { Schema, model, Document, Types } from 'mongoose';

export interface IRestaurant extends Document {
  name: string;
  slug: string;
  description?: string;
  owner?: Types.ObjectId;
  cuisines: string[];
  categories: Types.ObjectId[];
  coverImageUrl: string;
  galleryUrls: string[];
  address: string;
  location: { type: 'Point'; coordinates: [number, number] };
  priceForTwo: number;
  rating: number;
  ratingCount: number;
  deliveryTimeMins: number;
  deliveryFee: number;
  minOrderAmount: number;
  isVegOnly: boolean;
  isOpen: boolean;
  isActive: boolean;
  openingHours: { day: number; open: string; close: string }[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const restaurantSchema = new Schema<IRestaurant>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: String,
    owner: { type: Schema.Types.ObjectId, ref: 'User' },
    cuisines: { type: [String], index: true },
    categories: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
    coverImageUrl: { type: String, required: true },
    galleryUrls: [String],
    address: { type: String, required: true },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true },
    },
    priceForTwo: { type: Number, default: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0 },
    deliveryTimeMins: { type: Number, default: 30 },
    deliveryFee: { type: Number, default: 0 },
    minOrderAmount: { type: Number, default: 0 },
    isVegOnly: { type: Boolean, default: false },
    isOpen: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    openingHours: [{ day: Number, open: String, close: String }],
    tags: [String],
  },
  { timestamps: true },
);

restaurantSchema.index({ location: '2dsphere' });
restaurantSchema.index({ name: 'text', cuisines: 'text', tags: 'text' });

export const Restaurant = model<IRestaurant>('Restaurant', restaurantSchema);
