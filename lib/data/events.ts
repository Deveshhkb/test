import type { EventItem } from '@/types';

const img = (id: string, w = 1000) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

export const events: EventItem[] = [
  {
    id: 'e1',
    slug: 'ram-navami-mahotsav-2026',
    title: 'Ram Navami Mahotsav 2026',
    description: 'A grand nine-day celebration of the birth of Lord Rama in Ayodhya.',
    longDescription:
      'Experience the spiritual grandeur of Ram Navami in Ayodhya with continuous bhajans, the Surya Tilak ceremony, mass aartis on the Sarayu, and a spectacular procession through the temple town. Devotees from across the globe gather for this nine-day festival of devotion.',
    image: img('1604608672516-f1b9b1d37076'),
    date: '2026-09-15',
    endDate: '2026-09-23',
    location: 'Ayodhya, Uttar Pradesh',
    category: 'Festival',
    featured: true,
  },
  {
    id: 'e2',
    slug: 'maha-shivratri-kashi-2026',
    title: 'Maha Shivratri at Kashi',
    description: 'The great night of Shiva celebrated on the ghats of Varanasi.',
    longDescription:
      'Join millions of devotees as Kashi transforms into an ocean of light and chants on Maha Shivratri. Witness the midnight abhishekam at Kashi Vishwanath and the breathtaking Ganga Aarti.',
    image: img('1561361513-2d000a50f0dc'),
    date: '2026-08-10',
    location: 'Varanasi, Uttar Pradesh',
    category: 'Festival',
    featured: true,
  },
  {
    id: 'e3',
    slug: 'rath-yatra-puri-2026',
    title: 'Jagannath Rath Yatra',
    description: 'The world-famous chariot festival of Lord Jagannath in Puri.',
    longDescription:
      'Be part of the colossal Rath Yatra as three towering chariots are pulled by thousands of devotees along the Grand Road of Puri. A once-in-a-lifetime spiritual spectacle.',
    image: img('1605649487212-47bdab064df7'),
    date: '2026-07-04',
    location: 'Puri, Odisha',
    category: 'Yatra',
    featured: true,
  },
  {
    id: 'e4',
    slug: 'diwali-deepotsav-ayodhya-2026',
    title: 'Diwali Deepotsav',
    description: 'Millions of diyas illuminate the ghats of Ayodhya on Diwali.',
    longDescription:
      'The record-breaking Deepotsav lights up the Sarayu ghats with millions of earthen lamps, laser shows, and a grand aarti, recreating the joyous return of Lord Rama to Ayodhya.',
    image: img('1574236170880-f22433e8d3c5'),
    date: '2026-10-20',
    location: 'Ayodhya, Uttar Pradesh',
    category: 'Festival',
    featured: false,
  },
  {
    id: 'e5',
    slug: 'brahmotsavam-tirumala-2026',
    title: 'Tirumala Brahmotsavam',
    description: 'Nine days of divine processions at Tirupati Balaji.',
    longDescription:
      'The annual Brahmotsavam features Lord Venkateswara taken in procession on a different vahana each day, culminating in the grand Garuda Seva witnessed by lakhs of devotees.',
    image: img('1606298855672-3efb63017be8'),
    date: '2026-09-28',
    endDate: '2026-10-06',
    location: 'Tirumala, Andhra Pradesh',
    category: 'Festival',
    featured: false,
  },
  {
    id: 'e6',
    slug: 'spiritual-wellness-workshop-rishikesh',
    title: 'Spiritual Wellness & Yoga Retreat',
    description: 'A guided three-day retreat blending meditation, yoga and satsang.',
    longDescription:
      'Reconnect with your inner self at this immersive retreat on the banks of the Ganga in Rishikesh, featuring sunrise yoga, guided meditation, Ayurvedic cuisine, and evening satsangs.',
    image: img('1599661046289-e31897846e41'),
    date: '2026-11-12',
    endDate: '2026-11-14',
    location: 'Rishikesh, Uttarakhand',
    category: 'Workshop',
    featured: false,
  },
];
