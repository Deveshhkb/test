export interface Category {
  _id: string;
  name: string;
  slug: string;
  image?: string;
  isFeatured?: boolean;
}

export interface Brand {
  _id: string;
  name: string;
  slug: string;
  logo?: string;
}

export interface ProductColor {
  name: string;
  hex: string;
}

export interface Variant {
  _id: string;
  sku: string;
  color: string;
  colorHex?: string;
  size: string;
  price?: number;
  stock: number;
  image?: string;
}

export interface Product {
  _id: string;
  title: string;
  slug: string;
  description: string;
  specifications?: Record<string, string>;
  category?: Category;
  brand?: Brand;
  gender: string;
  price: number;
  compareAtPrice?: number;
  images: string[];
  colors: ProductColor[];
  sizes: string[];
  variants: Variant[];
  collections: string[];
  ratingAverage: number;
  ratingCount: number;
  soldCount: number;
  discountPercent?: number;
  inStock?: boolean;
  metaTitle?: string;
  metaDescription?: string;
}

export interface CartItem {
  _id: string;
  product: Product;
  variantId?: string;
  sku?: string;
  color?: string;
  size?: string;
  quantity: number;
  price: number;
}

export interface CartSummary {
  itemsTotal: number;
  discount: number;
  shippingFee: number;
  grandTotal: number;
  itemCount: number;
}

export interface Cart {
  _id: string;
  items: CartItem[];
  coupon?: { code: string; discount: number };
}

export interface Banner {
  _id: string;
  title: string;
  subtitle?: string;
  image: string;
  ctaText?: string;
  link?: string;
  placement: string;
}

export interface Review {
  _id: string;
  name: string;
  rating: number;
  title?: string;
  comment?: string;
  photos?: string[];
  verifiedPurchase?: boolean;
  createdAt: string;
  user?: { name: string; avatar?: string };
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

export interface OrderItem {
  product?: string;
  title: string;
  image: string;
  price: number;
  quantity: number;
  size?: string;
  color?: string;
}

export interface StatusEvent {
  status: string;
  at: string;
  note?: string;
}

export interface Order {
  _id: string;
  orderNumber: string;
  items: OrderItem[];
  itemsTotal?: number;
  shippingFee?: number;
  discount?: number;
  couponCode?: string;
  grandTotal: number;
  status: string;
  paymentStatus: string;
  paymentMethod?: string;
  shippingMethod?: string;
  shippingAddress?: {
    fullName?: string;
    phone?: string;
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
  };
  statusHistory?: StatusEvent[];
  createdAt: string;
}

export interface Address {
  _id: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  type: string;
  isDefault: boolean;
}
