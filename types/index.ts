// ---------------------------------------------------------------------------
// Core domain types for the Ayodhya Tirtham pilgrimage tourism platform.
// These mirror the shape that a real REST/GraphQL API would return, so the
// UI layer can be wired to a live backend by swapping the service layer only.
// ---------------------------------------------------------------------------

export type TempleCategory =
  | 'Vishnu'
  | 'Shiva'
  | 'Devi'
  | 'Ganesha'
  | 'Hanuman'
  | 'Jain'
  | 'Sikh'
  | 'Buddhist';

export interface TempleTiming {
  day: string;
  morning: string;
  evening: string;
}

export interface NearbyAttraction {
  name: string;
  distance: string;
  description: string;
}

export interface Review {
  id: string;
  author: string;
  avatar?: string;
  rating: number;
  date: string;
  comment: string;
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface Temple {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  history: string;
  travelGuide: string;
  image: string;
  gallery: string[];
  rating: number;
  reviewCount: number;
  category: TempleCategory;
  state: string;
  city: string;
  location: { lat: number; lng: number; address: string };
  timings: TempleTiming[];
  popularity: number; // 0-100 score used for sorting
  featured: boolean;
  deity: string;
  established: string;
  nearbyAttractions: NearbyAttraction[];
  festivals: string[];
  faqs: FAQ[];
  reviews: Review[];
}

export interface EventItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  longDescription: string;
  image: string;
  date: string; // ISO date
  endDate?: string;
  location: string;
  category: 'Festival' | 'Ceremony' | 'Yatra' | 'Workshop';
  featured: boolean;
}

export interface GalleryImage {
  id: string;
  src: string;
  alt: string;
  category: string;
  width: number;
  height: number;
}

export interface VideoItem {
  id: string;
  title: string;
  youtubeId: string;
  category: string;
  duration: string;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  cover: string;
  category: string;
  author: string;
  authorAvatar: string;
  date: string;
  readTime: string;
  tags: string[];
}

export interface TourPackage {
  id: string;
  slug: string;
  title: string;
  destination: string;
  duration: string;
  price: number;
  oldPrice?: number;
  image: string;
  rating: number;
  facilities: string[];
  itinerary: { day: number; title: string; detail: string }[];
  highlights: string[];
  popular: boolean;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  avatar: string;
  rating: number;
  quote: string;
}

export interface Stat {
  id: string;
  label: string;
  value: number;
  suffix?: string;
  icon: string;
}

export interface Destination {
  id: string;
  name: string;
  state: string;
  image: string;
  templeCount: number;
  description: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface TempleFilters {
  search?: string;
  state?: string;
  category?: TempleCategory | 'All';
  sort?: 'popularity' | 'rating' | 'name';
  page?: number;
  pageSize?: number;
}
