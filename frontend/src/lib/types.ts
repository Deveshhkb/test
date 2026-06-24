import type { LanguageCode } from '@/i18n/languages';

export type Localized = Partial<Record<LanguageCode, string>>;

export interface Destination {
  slug: string;
  name: Localized;
  state: string;
  shortDescription: Localized;
  description: Localized;
  coverImage: string;
  highlights: string[];
  bestTimeToVisit: string;
  templeCount: number;
  rating: number;
  featured?: boolean;
}

export interface Temple {
  slug: string;
  name: Localized;
  destination: string;
  category: string;
  description: Localized;
  history: Localized;
  darshanTimings: string;
  aartiTimings: string;
  dressCode: Localized;
  coverImage: string;
  gallery: string[];
  location: { lat: number; lng: number; address: string };
  nearbyAttractions: { name: string; distance: string }[];
}

export interface ItineraryDay {
  day: number;
  title: Localized;
  description: Localized;
}

export interface TourPackage {
  slug: string;
  title: Localized;
  summary: Localized;
  description: Localized;
  destinations: string[];
  durationDays: number;
  durationNights: number;
  price: number;
  discountPrice?: number;
  coverImage: string;
  gallery: string[];
  inclusions: string[];
  exclusions: string[];
  hotelInfo: Localized;
  vehicleInfo: Localized;
  itinerary: ItineraryDay[];
  faq: { question: Localized; answer: Localized }[];
  rating: number;
  reviewsCount: number;
  featured?: boolean;
  popular?: boolean;
}

export interface Hotel {
  slug: string;
  name: string;
  destination: string;
  description: Localized;
  coverImage: string;
  pricePerNight: number;
  rating: number;
  starCategory: number;
  amenities: string[];
  address: string;
}

export interface Cab {
  vehicleType: 'Sedan' | 'SUV' | 'Luxury';
  name: string;
  seats: number;
  pricePerKm: number;
  baseFare: number;
  image: string;
  features: string[];
}

export interface BlogPost {
  slug: string;
  title: Localized;
  excerpt: Localized;
  content: Localized;
  coverImage: string;
  category: string;
  tags: string[];
  readTime: number;
  date: string;
}

export interface GalleryItem {
  title: string;
  type: 'image' | 'video';
  category: string;
  url: string;
}

export interface Testimonial {
  name: string;
  location: string;
  rating: number;
  message: string;
}
