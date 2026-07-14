import { Schema, model, Document, Types } from 'mongoose';

/** Driver operational profile — auth/identity lives on the linked User (role: 'driver'). */
export interface IDriver extends Document {
  user: Types.ObjectId;
  vehicleType: 'bike' | 'scooter' | 'bicycle' | 'car';
  vehicleNumber: string;
  licenseNumber: string;
  isApproved: boolean;
  isOnline: boolean;
  currentLocation?: { type: 'Point'; coordinates: [number, number] };
  activeOrder?: Types.ObjectId;
  rating: number;
  ratingCount: number;
  totalDeliveries: number;
  earnings: { date: Date; amount: number; order: Types.ObjectId }[];
  createdAt: Date;
  updatedAt: Date;
}

const driverSchema = new Schema<IDriver>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    vehicleType: { type: String, enum: ['bike', 'scooter', 'bicycle', 'car'], default: 'bike' },
    vehicleNumber: { type: String, required: true },
    licenseNumber: { type: String, required: true },
    isApproved: { type: Boolean, default: false },
    isOnline: { type: Boolean, default: false, index: true },
    currentLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: [Number],
    },
    activeOrder: { type: Schema.Types.ObjectId, ref: 'Order' },
    rating: { type: Number, default: 5 },
    ratingCount: { type: Number, default: 0 },
    totalDeliveries: { type: Number, default: 0 },
    earnings: [
      {
        date: { type: Date, default: Date.now },
        amount: Number,
        order: { type: Schema.Types.ObjectId, ref: 'Order' },
      },
    ],
  },
  { timestamps: true },
);

driverSchema.index({ currentLocation: '2dsphere' });

export const Driver = model<IDriver>('Driver', driverSchema);
