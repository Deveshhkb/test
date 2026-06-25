// Field/column definitions for each admin module. The generic AdminResourceManager
// renders forms and lists from these configs against the existing REST API.

export type FieldType =
  | 'text'
  | 'number'
  | 'textarea'
  | 'localized'
  | 'localizedArea'
  | 'array'
  | 'boolean'
  | 'image'
  | 'select'
  | 'json';

export interface AdminField {
  name: string;
  label: string;
  type: FieldType;
  options?: string[];
}

export interface ResourceConfig {
  key: string;
  endpoint: string;
  label: string;
  primary: string; // path used as the item title in the list (e.g. 'title.en')
  secondary?: string; // small secondary value (e.g. 'price', 'category')
  detail?: string; // extra line shown in the list (e.g. enquiry message)
  fields: AdminField[];
  noCreate?: boolean; // hide "Add new" (enquiries / users)
}

const LANG_NOTE = ' (English shown; Hindi optional)';

export const RESOURCE_CONFIGS: Record<string, ResourceConfig> = {
  packages: {
    key: 'packages',
    endpoint: '/packages',
    label: 'Packages',
    primary: 'title.en',
    secondary: 'price',
    fields: [
      { name: 'title', label: 'Title' + LANG_NOTE, type: 'localized' },
      { name: 'summary', label: 'Summary', type: 'localizedArea' },
      { name: 'description', label: 'Description', type: 'localizedArea' },
      { name: 'durationDays', label: 'Duration (days)', type: 'number' },
      { name: 'durationNights', label: 'Duration (nights)', type: 'number' },
      { name: 'price', label: 'Price (₹)', type: 'number' },
      { name: 'discountPrice', label: 'Discount Price (₹)', type: 'number' },
      { name: 'coverImage', label: 'Cover Image URL', type: 'image' },
      { name: 'inclusions', label: 'Inclusions (comma separated)', type: 'array' },
      { name: 'exclusions', label: 'Exclusions (comma separated)', type: 'array' },
      { name: 'hotelInfo', label: 'Hotel Info', type: 'localizedArea' },
      { name: 'vehicleInfo', label: 'Vehicle Info', type: 'localizedArea' },
      { name: 'itinerary', label: 'Itinerary (JSON)', type: 'json' },
      { name: 'faq', label: 'FAQ (JSON)', type: 'json' },
      { name: 'rating', label: 'Rating', type: 'number' },
      { name: 'reviewsCount', label: 'Reviews Count', type: 'number' },
      { name: 'featured', label: 'Featured', type: 'boolean' },
      { name: 'popular', label: 'Popular', type: 'boolean' },
    ],
  },
  destinations: {
    key: 'destinations',
    endpoint: '/destinations',
    label: 'Destinations',
    primary: 'name.en',
    secondary: 'state',
    fields: [
      { name: 'name', label: 'Name' + LANG_NOTE, type: 'localized' },
      { name: 'state', label: 'State', type: 'text' },
      { name: 'shortDescription', label: 'Short Description', type: 'localizedArea' },
      { name: 'description', label: 'Description', type: 'localizedArea' },
      { name: 'coverImage', label: 'Cover Image URL', type: 'image' },
      { name: 'highlights', label: 'Highlights (comma separated)', type: 'array' },
      { name: 'bestTimeToVisit', label: 'Best Time to Visit', type: 'text' },
      { name: 'templeCount', label: 'Temple Count', type: 'number' },
      { name: 'rating', label: 'Rating', type: 'number' },
      { name: 'featured', label: 'Featured', type: 'boolean' },
    ],
  },
  temples: {
    key: 'temples',
    endpoint: '/temples',
    label: 'Temples',
    primary: 'name.en',
    secondary: 'category',
    fields: [
      { name: 'name', label: 'Name' + LANG_NOTE, type: 'localized' },
      {
        name: 'category',
        label: 'Category',
        type: 'select',
        options: ['Ram Temple', 'Shiva Temple', 'Krishna Temple', 'Devi Temple', 'Hanuman Temple', 'Other'],
      },
      { name: 'description', label: 'Description', type: 'localizedArea' },
      { name: 'history', label: 'History', type: 'localizedArea' },
      { name: 'darshanTimings', label: 'Darshan Timings', type: 'text' },
      { name: 'aartiTimings', label: 'Aarti Timings', type: 'text' },
      { name: 'dressCode', label: 'Dress Code', type: 'localizedArea' },
      { name: 'coverImage', label: 'Cover Image URL', type: 'image' },
      { name: 'gallery', label: 'Gallery URLs (comma separated)', type: 'array' },
      { name: 'nearbyAttractions', label: 'Nearby Attractions (JSON)', type: 'json' },
      { name: 'location', label: 'Location (JSON)', type: 'json' },
      { name: 'featured', label: 'Featured', type: 'boolean' },
    ],
  },
  hotels: {
    key: 'hotels',
    endpoint: '/hotels',
    label: 'Hotels',
    primary: 'name',
    secondary: 'pricePerNight',
    fields: [
      { name: 'name', label: 'Name', type: 'text' },
      { name: 'description', label: 'Description', type: 'localizedArea' },
      { name: 'coverImage', label: 'Cover Image URL', type: 'image' },
      { name: 'pricePerNight', label: 'Price / Night (₹)', type: 'number' },
      { name: 'rating', label: 'Rating', type: 'number' },
      { name: 'starCategory', label: 'Star Category (1-5)', type: 'number' },
      { name: 'amenities', label: 'Amenities (comma separated)', type: 'array' },
      { name: 'address', label: 'Address', type: 'text' },
      { name: 'featured', label: 'Featured', type: 'boolean' },
    ],
  },
  blogs: {
    key: 'blogs',
    endpoint: '/blogs',
    label: 'Blogs',
    primary: 'title.en',
    secondary: 'category',
    fields: [
      { name: 'title', label: 'Title' + LANG_NOTE, type: 'localized' },
      { name: 'excerpt', label: 'Excerpt', type: 'localizedArea' },
      { name: 'content', label: 'Content', type: 'localizedArea' },
      { name: 'coverImage', label: 'Cover Image URL', type: 'image' },
      { name: 'category', label: 'Category', type: 'text' },
      { name: 'tags', label: 'Tags (comma separated)', type: 'array' },
      { name: 'readTime', label: 'Read Time (min)', type: 'number' },
      { name: 'published', label: 'Published', type: 'boolean' },
    ],
  },
  gallery: {
    key: 'gallery',
    endpoint: '/gallery',
    label: 'Gallery',
    primary: 'title',
    secondary: 'category',
    fields: [
      { name: 'title', label: 'Title', type: 'text' },
      { name: 'type', label: 'Type', type: 'select', options: ['image', 'video'] },
      {
        name: 'category',
        label: 'Category',
        type: 'select',
        options: ['Temples', 'Festivals', 'Ghats', 'Aarti', 'Nature', 'Pilgrims'],
      },
      { name: 'url', label: 'Image / Video URL', type: 'image' },
      { name: 'thumbnail', label: 'Thumbnail URL', type: 'image' },
      { name: 'featured', label: 'Featured', type: 'boolean' },
    ],
  },
  enquiries: {
    key: 'enquiries',
    endpoint: '/enquiries',
    label: 'Enquiries',
    primary: 'name',
    secondary: 'status',
    detail: 'message',
    noCreate: true,
    fields: [{ name: 'status', label: 'Status', type: 'select', options: ['new', 'contacted', 'closed'] }],
  },
  users: {
    key: 'users',
    endpoint: '/admin/users',
    label: 'Users',
    primary: 'name',
    secondary: 'role',
    detail: 'email',
    noCreate: true,
    fields: [{ name: 'role', label: 'Role', type: 'select', options: ['user', 'admin'] }],
  },
};

// Maps the translation keys used on the admin dashboard to a resource config.
export const MODULE_TO_RESOURCE: Record<string, string> = {
  managePackages: 'packages',
  manageDestinations: 'destinations',
  manageTemples: 'temples',
  manageHotels: 'hotels',
  manageBlogs: 'blogs',
  manageGallery: 'gallery',
  manageEnquiries: 'enquiries',
  manageUsers: 'users',
};
