import type { BlogPost } from '@/types';

const u = (id: string, w = 1200) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

const avatar = (s: number) => `https://i.pravatar.cc/100?img=${s}`;

const longContent = `
## A Journey Within

Pilgrimage in India is not merely travel — it is a movement of the soul. Every
step toward a sacred shrine is a step inward, shedding the noise of everyday
life and awakening a deeper stillness.

### Preparing for the Yatra

Begin with intention. Traditional pilgrims observe a sattvic diet, rise before
dawn, and carry minimal possessions. Modern travellers can honour the same
spirit by travelling light and keeping schedules flexible.

### What to Expect

Expect crowds during festival seasons, early-morning aartis that stir the
heart, and the timeless rhythm of temple bells. Patience and reverence go a
long way.

> "The destination is sacred, but so is every mile that leads to it."

### Practical Tips

- Book darshan and accommodation in advance during festivals.
- Respect local customs and dress codes.
- Stay hydrated and carry comfortable footwear.
- Engage local guides for richer historical context.
`;

export const blogPosts: BlogPost[] = [
  {
    id: 'b1',
    slug: 'ultimate-guide-to-ayodhya-pilgrimage',
    title: 'The Ultimate Guide to an Ayodhya Pilgrimage',
    excerpt:
      'Everything you need to plan a soul-stirring visit to the birthplace of Lord Rama — from darshan timings to hidden ghats.',
    content: longContent,
    cover: u('1604608672516-f1b9b1d37076'),
    category: 'Travel Guide',
    author: 'Priya Nair',
    authorAvatar: avatar(5),
    date: '2026-05-18',
    readTime: '8 min read',
    tags: ['Ayodhya', 'Planning', 'Darshan'],
  },
  {
    id: 'b2',
    slug: 'twelve-jyotirlingas-explained',
    title: 'The Twelve Jyotirlingas Explained',
    excerpt:
      'A spiritual map of the twelve radiant abodes of Lord Shiva and how to plan a Jyotirlinga yatra.',
    content: longContent,
    cover: u('1561361513-2d000a50f0dc'),
    category: 'Spirituality',
    author: 'Arjun Desai',
    authorAvatar: avatar(12),
    date: '2026-04-30',
    readTime: '11 min read',
    tags: ['Shiva', 'Jyotirlinga', 'Yatra'],
  },
  {
    id: 'b3',
    slug: 'festivals-that-define-sacred-india',
    title: 'Festivals That Define Sacred India',
    excerpt:
      'From the Rath Yatra to Deepotsav, discover the festivals every pilgrim should experience at least once.',
    content: longContent,
    cover: u('1574236170880-f22433e8d3c5'),
    category: 'Festivals',
    author: 'Kavya Reddy',
    authorAvatar: avatar(20),
    date: '2026-04-08',
    readTime: '6 min read',
    tags: ['Festivals', 'Culture'],
  },
  {
    id: 'b4',
    slug: 'mindful-travel-spiritual-wellness',
    title: 'Mindful Travel: Blending Wellness and Worship',
    excerpt:
      'How to weave meditation, yoga and Ayurveda into your pilgrimage for a truly restorative journey.',
    content: longContent,
    cover: u('1599661046289-e31897846e41'),
    category: 'Wellness',
    author: 'Dr. Sameer Joshi',
    authorAvatar: avatar(33),
    date: '2026-03-22',
    readTime: '7 min read',
    tags: ['Wellness', 'Yoga', 'Mindfulness'],
  },
  {
    id: 'b5',
    slug: 'temple-architecture-styles-of-india',
    title: 'Decoding the Temple Architecture Styles of India',
    excerpt:
      'Nagara, Dravidian and Vesara — a friendly primer on reading the sacred geometry of Indian temples.',
    content: longContent,
    cover: u('1621996346565-e3dbc646d9a9'),
    category: 'Heritage',
    author: 'Ritu Malhotra',
    authorAvatar: avatar(45),
    date: '2026-02-14',
    readTime: '9 min read',
    tags: ['Architecture', 'Heritage'],
  },
  {
    id: 'b6',
    slug: 'first-time-pilgrim-checklist',
    title: 'The First-Time Pilgrim’s Checklist',
    excerpt:
      'Packing, etiquette and safety essentials for your very first temple pilgrimage across India.',
    content: longContent,
    cover: u('1588096344356-9b02fafabb09'),
    category: 'Travel Guide',
    author: 'Priya Nair',
    authorAvatar: avatar(5),
    date: '2026-01-29',
    readTime: '5 min read',
    tags: ['Planning', 'Tips'],
  },
];

export const blogCategories = [
  'All',
  'Travel Guide',
  'Spirituality',
  'Festivals',
  'Wellness',
  'Heritage',
];
