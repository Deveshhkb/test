import { Schema, model, Document, Types } from 'mongoose';

export interface IAddress {
  _id?: Types.ObjectId;
  label: 'home' | 'work' | 'other';
  line1: string;
  line2?: string;
  city: string;
  pincode: string;
  location: { type: 'Point'; coordinates: [number, number] }; // [lng, lat]
  isDefault: boolean;
}

export interface IUser extends Document {
  firebaseUid?: string;
  name: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  role: 'customer' | 'driver' | 'admin' | 'restaurant_owner';
  addresses: IAddress[];
  wishlist: Types.ObjectId[];
  fcmTokens: string[];
  language: string;
  dietaryPreference?: 'veg' | 'non_veg' | 'vegan';
  isBlocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const addressSchema = new Schema<IAddress>({
  label: { type: String, enum: ['home', 'work', 'other'], default: 'home' },
  line1: { type: String, required: true },
  line2: String,
  city: { type: String, required: true },
  pincode: { type: String, required: true },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true },
  },
  isDefault: { type: Boolean, default: false },
});

const userSchema = new Schema<IUser>(
  {
    firebaseUid: { type: String, index: true, sparse: true, unique: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, index: true, sparse: true },
    phone: { type: String, index: true, sparse: true },
    avatarUrl: String,
    role: {
      type: String,
      enum: ['customer', 'driver', 'admin', 'restaurant_owner'],
      default: 'customer',
      index: true,
    },
    addresses: [addressSchema],
    wishlist: [{ type: Schema.Types.ObjectId, ref: 'Restaurant' }],
    fcmTokens: [String],
    language: { type: String, default: 'en' },
    dietaryPreference: { type: String, enum: ['veg', 'non_veg', 'vegan'] },
    isBlocked: { type: Boolean, default: false },
  },
  { timestamps: true },
);

userSchema.index({ 'addresses.location': '2dsphere' });

export const User = model<IUser>('User', userSchema);
