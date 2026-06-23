// Central site configuration used across SEO, navigation and the footer.

// Canonical site origin used for metadataBase, robots and every sitemap URL.
// Override per environment with NEXT_PUBLIC_SITE_URL (e.g. a custom domain or
// Vercel URL). Defaults to the GitHub Pages deployment configured in
// next.config.mjs so crawlers and shared links resolve to the live site.
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://deveshhkb.github.io/test').replace(
  /\/$/,
  '',
);

export const siteConfig = {
  name: 'Ayodhya Tirtham',
  tagline: 'Premium Spiritual Pilgrimage Journeys',
  description:
    'Ayodhya Tirtham is a premium pilgrimage tourism platform offering curated temple darshans, sacred yatras, festivals and spiritual wellness retreats across India.',
  url: siteUrl,
  ogImage: 'https://images.unsplash.com/photo-1604608672516-f1b9b1d37076?auto=format&fit=crop&w=1200&q=80',
  keywords: [
    'pilgrimage tourism',
    'temple tours India',
    'Ayodhya darshan',
    'spiritual travel',
    'Char Dham yatra',
    'temple directory',
    'Hindu temples',
    'religious tourism',
  ],
  contact: {
    phone: '+91 98765 43210',
    email: 'yatra@ayodhya-tirtham.com',
    address: 'Tirtham Tower, Ram Path, Ayodhya, Uttar Pradesh 224123',
  },
  social: {
    facebook: 'https://facebook.com',
    instagram: 'https://instagram.com',
    youtube: 'https://youtube.com',
    twitter: 'https://twitter.com',
  },
};

export type NavLink = {
  label: string;
  href: string;
  children?: { label: string; href: string; description?: string }[];
};

export const navLinks: NavLink[] = [
  { label: 'Home', href: '/' },
  {
    label: 'Temples',
    href: '/temples',
    children: [
      { label: 'Temple Directory', href: '/temples', description: 'Browse 1200+ sacred temples' },
      { label: 'Featured Temples', href: '/temples?sort=popularity', description: 'Most visited shrines' },
      { label: 'By State', href: '/temples', description: 'Find temples by region' },
    ],
  },
  {
    label: 'Experiences',
    href: '/packages',
    children: [
      { label: 'Pilgrimage Packages', href: '/packages', description: 'Curated yatra packages' },
      { label: 'Events & Festivals', href: '/events', description: 'Upcoming sacred celebrations' },
      { label: 'Photo Gallery', href: '/gallery', description: 'Moments of devotion' },
      { label: 'Video Gallery', href: '/videos', description: 'Temple films & aerials' },
    ],
  },
  { label: 'Blog', href: '/blog' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

export const footerLinks = {
  explore: [
    { label: 'Temple Directory', href: '/temples' },
    { label: 'Pilgrimage Packages', href: '/packages' },
    { label: 'Events & Festivals', href: '/events' },
    { label: 'Photo Gallery', href: '/gallery' },
    { label: 'Video Gallery', href: '/videos' },
  ],
  company: [
    { label: 'About Us', href: '/about' },
    { label: 'Blog & News', href: '/blog' },
    { label: 'Contact', href: '/contact' },
    { label: 'Testimonials', href: '/#testimonials' },
    { label: 'FAQ', href: '/#faq' },
  ],
};

export const indianStates = [
  'All',
  'Andhra Pradesh',
  'Gujarat',
  'Maharashtra',
  'Odisha',
  'Punjab',
  'Tamil Nadu',
  'Uttar Pradesh',
];

export const templeCategories = [
  'All',
  'Vishnu',
  'Shiva',
  'Devi',
  'Ganesha',
  'Hanuman',
  'Jain',
  'Sikh',
  'Buddhist',
] as const;
