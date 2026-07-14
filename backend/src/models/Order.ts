import { Schema, model, Document, Types } from 'mongoose';

export type OrderStatus =
  | 'pending_payment'
  | 'placed'
  | 'confirmed'
  | 'preparing'
  | 'ready_for_pickup'
  | 'picked_up'
  | 'on_the_way'
  | 'delivered'
  | 'cancelled';

export interface IOrderItem {
  menuItem: Types.ObjectId;
  name: string;
  quantity: number;
  unitPrice: number; // base + variant, per unit
  variant?: string;
  addOns: { name: string; price: number }[];
  totalPrice: number;
}

export interface IOrder extends Document {
  orderNumber: string;
  user: Types.ObjectId;
  restaurant: Types.ObjectId;
  driver?: Types.ObjectId;
  items: IOrderItem[];
  status: OrderStatus;
  statusHistory: { status: OrderStatus; at: Date }[];
  deliveryAddress: {
    line1: string;
    city: string;
    pincode: string;
    location: { type: 'Point'; coordinates: [number, number] };
  };
  pricing: {
    itemsTotal: number;
    deliveryFee: number;
    taxes: number;
    discount: number;
    grandTotal: number;
  };
  coupon?: { code: string; discount: number };
  payment: {
    provider: 'razorpay' | 'stripe' | 'cod';
    status: 'pending' | 'paid' | 'failed' | 'refunded';
    providerOrderId?: string;
    providerPaymentId?: string;
  };
  eta?: Date;
  specialInstructions?: string;
  rated: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    restaurant: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    driver: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    items: [
      {
        menuItem: { type: Schema.Types.ObjectId, ref: 'MenuItem' },
        name: String,
        quantity: Number,
        unitPrice: Number,
        variant: String,
        addOns: [{ name: String, price: Number }],
        totalPrice: Number,
      },
    ],
    status: {
      type: String,
      enum: [
        'pending_payment', 'placed', 'confirmed', 'preparing', 'ready_for_pickup',
        'picked_up', 'on_the_way', 'delivered', 'cancelled',
      ],
      default: 'pending_payment',
      index: true,
    },
    statusHistory: [{ status: String, at: { type: Date, default: Date.now } }],
    deliveryAddress: {
      line1: String,
      city: String,
      pincode: String,
      location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: [Number],
      },
    },
    pricing: {
      itemsTotal: Number,
      deliveryFee: Number,
      taxes: Number,
      discount: { type: Number, default: 0 },
      grandTotal: Number,
    },
    coupon: { code: String, discount: Number },
    payment: {
      provider: { type: String, enum: ['razorpay', 'stripe', 'cod'], default: 'razorpay' },
      status: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
      providerOrderId: String,
      providerPaymentId: String,
    },
    eta: Date,
    specialInstructions: String,
    rated: { type: Boolean, default: false },
  },
  { timestamps: true },
);

orderSchema.index({ createdAt: -1 });

export const Order = model<IOrder>('Order', orderSchema);
