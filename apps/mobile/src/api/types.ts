export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface Address {
  _id: string;
  label: 'home' | 'work' | 'other';
  line1: string;
  line2?: string;
  city: string;
  pincode: string;
  location: { type: 'Point'; coordinates: [number, number] };
  isDefault: boolean;
}

export interface User {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  role: 'customer' | 'driver' | 'admin' | 'restaurant_owner';
  addresses: Address[];
  wishlist: string[];
  language: string;
  dietaryPreference?: 'veg' | 'non_veg' | 'vegan';
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  imageUrl: string;
}

export interface Restaurant {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  cuisines: string[];
  coverImageUrl: string;
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
  tags: string[];
  _reason?: string; // recommendation explanation
}

export interface MenuItem {
  _id: string;
  restaurant: string;
  name: string;
  description?: string;
  imageUrl?: string;
  section: string;
  basePrice: number;
  variants: { name: string; price: number }[];
  addOns: { name: string; price: number }[];
  isVeg: boolean;
  isBestseller: boolean;
  isAvailable: boolean;
  spiceLevel?: 'mild' | 'medium' | 'hot';
  calories?: number;
}

export interface MenuSection {
  title: string;
  items: MenuItem[];
}

export type OrderStatus =
  | 'pending_payment' | 'placed' | 'confirmed' | 'preparing' | 'ready_for_pickup'
  | 'picked_up' | 'on_the_way' | 'delivered' | 'cancelled';

export interface Order {
  _id: string;
  orderNumber: string;
  restaurant: Pick<Restaurant, '_id' | 'name' | 'coverImageUrl'> & {
    address?: string;
    location?: { coordinates: [number, number] };
  };
  driver?: { _id: string; name: string; phone?: string; avatarUrl?: string };
  items: {
    name: string;
    quantity: number;
    unitPrice: number;
    variant?: string;
    addOns: { name: string; price: number }[];
    totalPrice: number;
  }[];
  status: OrderStatus;
  statusHistory: { status: OrderStatus; at: string }[];
  deliveryAddress: { line1: string; city: string; location: { coordinates: [number, number] } };
  pricing: {
    itemsTotal: number;
    deliveryFee: number;
    taxes: number;
    discount: number;
    grandTotal: number;
  };
  coupon?: { code: string; discount: number };
  payment: { provider: string; status: string };
  eta?: string;
  rated: boolean;
  createdAt: string;
}

export interface Coupon {
  _id: string;
  code: string;
  title: string;
  description?: string;
  discountType: 'percent' | 'flat';
  discountValue: number;
  maxDiscount?: number;
  minOrderAmount: number;
}

export interface Review {
  _id: string;
  user: { name: string; avatarUrl?: string };
  rating: number;
  comment?: string;
  photos: string[];
  createdAt: string;
}

export interface PaymentIntent {
  id: string;
  keyId?: string; // razorpay
  clientSecret?: string; // stripe
  amount: number;
  currency: string;
}
