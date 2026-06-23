import type { Temple } from '@/types';

const UNSPLASH = (id: string, w = 1200) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

const sampleTimings = [
  { day: 'Monday – Friday', morning: '5:00 AM – 12:30 PM', evening: '4:00 PM – 9:30 PM' },
  { day: 'Saturday – Sunday', morning: '4:30 AM – 1:00 PM', evening: '3:30 PM – 10:00 PM' },
  { day: 'Festival Days', morning: '3:00 AM – 2:00 PM', evening: '3:00 PM – 11:00 PM' },
];

const sampleFaqs = [
  {
    question: 'What is the best time to visit?',
    answer:
      'Early morning during the Mangala Aarti offers a serene experience with fewer crowds. The festival season also showcases the temple at its most vibrant.',
  },
  {
    question: 'Is there a dress code?',
    answer:
      'Modest traditional attire is recommended. Shoulders and knees should be covered. Footwear must be removed before entering the sanctum.',
  },
  {
    question: 'Are photography and mobile phones allowed?',
    answer:
      'Photography is permitted in the outer premises but restricted inside the sanctum sanctorum. Please follow the signage and staff guidance.',
  },
];

const sampleReviews = [
  {
    id: 'r1',
    author: 'Ananya Sharma',
    rating: 5,
    date: '2026-04-12',
    comment:
      'A profoundly peaceful experience. The architecture and the evening aarti left us spellbound.',
  },
  {
    id: 'r2',
    author: 'Rohit Verma',
    rating: 4,
    date: '2026-03-28',
    comment: 'Well managed crowd and very clean premises. The travel guide on this site helped a lot.',
  },
  {
    id: 'r3',
    author: 'Meera Iyer',
    rating: 5,
    date: '2026-02-15',
    comment: 'Divine vibrations everywhere. Highly recommend visiting during Brahma Muhurta.',
  },
];

export const temples: Temple[] = [
  {
    id: 't1',
    slug: 'shri-ram-janmabhoomi-ayodhya',
    name: 'Shri Ram Janmabhoomi Mandir',
    shortDescription:
      'The grand temple marking the birthplace of Lord Rama on the sacred banks of the Sarayu.',
    description:
      'The Shri Ram Janmabhoomi Mandir in Ayodhya is one of the most revered pilgrimage sites in India, built in the traditional Nagara style of temple architecture. Its towering shikharas, intricately carved pillars and gold-leafed sanctum draw millions of devotees every year.',
    history:
      'Ayodhya is described in the Ramayana as the capital of the Kosala kingdom and the birthplace of Lord Rama. The current temple was consecrated as a magnificent monument to faith, designed with 360 pillars and crafted from pink sandstone, reviving centuries of devotional tradition.',
    travelGuide:
      'Ayodhya is well connected by the Maharishi Valmiki International Airport and Ayodhya Dham Junction. E-rickshaws and shuttle services ferry pilgrims from the city centre to the temple complex. Plan early-morning darshan to avoid peak crowds.',
    image: UNSPLASH('1609920658906-8223bd289001'),
    gallery: [
      UNSPLASH('1582510003544-4d00b7f74220'),
      UNSPLASH('1604608672516-f1b9b1d37076'),
      UNSPLASH('1567253186010-1c2c8b0c0c0f'),
      UNSPLASH('1605649487212-47bdab064df7'),
    ],
    rating: 4.9,
    reviewCount: 18420,
    category: 'Vishnu',
    state: 'Uttar Pradesh',
    city: 'Ayodhya',
    location: {
      lat: 26.7956,
      lng: 82.1943,
      address: 'Ram Janmabhoomi, Ayodhya, Uttar Pradesh 224123',
    },
    timings: sampleTimings,
    popularity: 100,
    featured: true,
    deity: 'Lord Rama',
    established: 'Consecrated 2024',
    nearbyAttractions: [
      { name: 'Hanuman Garhi', distance: '1.2 km', description: 'Hilltop fort temple of Lord Hanuman.' },
      { name: 'Kanak Bhawan', distance: '0.8 km', description: 'Ornate palace temple of Sita-Ram.' },
      { name: 'Sarayu Ghat', distance: '2.0 km', description: 'Sacred river ghat for evening aarti.' },
    ],
    festivals: ['Ram Navami', 'Diwali Deepotsav', 'Vivah Panchami'],
    faqs: sampleFaqs,
    reviews: sampleReviews,
  },
  {
    id: 't2',
    slug: 'kashi-vishwanath-varanasi',
    name: 'Kashi Vishwanath Temple',
    shortDescription:
      'One of the twelve Jyotirlingas, glowing on the ghats of the eternal city of Varanasi.',
    description:
      'The Kashi Vishwanath Temple stands as one of the most sacred Shiva shrines in the world. Its golden spire dominates the Varanasi skyline, and the newly developed corridor connects the temple directly to the holy Ganga.',
    history:
      'Mentioned in the Puranas, the temple has been rebuilt several times across the centuries. The present structure, with its gold-plated dome donated by Maharaja Ranjit Singh, embodies the undying spiritual heart of Kashi.',
    travelGuide:
      'Reach Varanasi via Lal Bahadur Shastri Airport or Varanasi Junction. The Vishwanath Corridor offers organized darshan lines. A sunrise boat ride on the Ganga is a must-do before your visit.',
    image: UNSPLASH('1561361513-2d000a50f0dc'),
    gallery: [
      UNSPLASH('1567427017947-545c5f8d16ad'),
      UNSPLASH('1596402184320-417e7178b2cd'),
      UNSPLASH('1574236170880-f22433e8d3c5'),
      UNSPLASH('1599661046289-e31897846e41'),
    ],
    rating: 4.8,
    reviewCount: 15230,
    category: 'Shiva',
    state: 'Uttar Pradesh',
    city: 'Varanasi',
    location: {
      lat: 25.3109,
      lng: 83.0107,
      address: 'Lahori Tola, Varanasi, Uttar Pradesh 221001',
    },
    timings: sampleTimings,
    popularity: 96,
    featured: true,
    deity: 'Lord Shiva',
    established: '11th Century (rebuilt 1780)',
    nearbyAttractions: [
      { name: 'Dashashwamedh Ghat', distance: '0.5 km', description: 'Famous for the grand Ganga Aarti.' },
      { name: 'Sarnath', distance: '10 km', description: 'Where Buddha gave his first sermon.' },
      { name: 'Manikarnika Ghat', distance: '0.9 km', description: 'The eternal cremation ghat.' },
    ],
    festivals: ['Maha Shivratri', 'Dev Deepawali', 'Shravan Month'],
    faqs: sampleFaqs,
    reviews: sampleReviews,
  },
  {
    id: 't3',
    slug: 'meenakshi-amman-madurai',
    name: 'Meenakshi Amman Temple',
    shortDescription:
      'A dazzling Dravidian masterpiece with towering gopurams dedicated to Goddess Meenakshi.',
    description:
      'The Meenakshi Amman Temple in Madurai is a historic Hindu temple known for its 14 colourful gopurams covered in thousands of sculpted figures, and the mesmerizing Hall of a Thousand Pillars.',
    history:
      'The temple complex traces its origins to the Pandyan dynasty and was substantially expanded during the Nayak period. It is dedicated to Goddess Meenakshi, a form of Parvati, and her consort Sundareswarar.',
    travelGuide:
      'Madurai Airport and Madurai Junction connect the city to major hubs. The temple is in the heart of the old city; auto-rickshaws are the easiest way to navigate the narrow lanes.',
    image: UNSPLASH('1621996346565-e3dbc646d9a9'),
    gallery: [
      UNSPLASH('1582510003544-4d00b7f74220'),
      UNSPLASH('1590050752117-238cb0fb12b1'),
      UNSPLASH('1609920658906-8223bd289001'),
      UNSPLASH('1604608672516-f1b9b1d37076'),
    ],
    rating: 4.9,
    reviewCount: 12890,
    category: 'Devi',
    state: 'Tamil Nadu',
    city: 'Madurai',
    location: {
      lat: 9.9195,
      lng: 78.1193,
      address: 'Madurai Main, Madurai, Tamil Nadu 625001',
    },
    timings: sampleTimings,
    popularity: 92,
    featured: true,
    deity: 'Goddess Meenakshi',
    established: '6th Century CE',
    nearbyAttractions: [
      { name: 'Thirumalai Nayakkar Mahal', distance: '1.5 km', description: 'A grand 17th-century palace.' },
      { name: 'Gandhi Memorial Museum', distance: '4 km', description: 'Historic museum and gardens.' },
      { name: 'Alagar Kovil', distance: '21 km', description: 'Hilltop Vishnu temple.' },
    ],
    festivals: ['Meenakshi Thirukalyanam', 'Chithirai Festival', 'Navaratri'],
    faqs: sampleFaqs,
    reviews: sampleReviews,
  },
  {
    id: 't4',
    slug: 'golden-temple-amritsar',
    name: 'Golden Temple (Harmandir Sahib)',
    shortDescription:
      'The serene golden sanctum of Sikhism shimmering amid the sacred Amrit Sarovar.',
    description:
      'The Golden Temple, or Harmandir Sahib, is the holiest gurdwara of Sikhism. Its gold-plated upper floors reflect in the surrounding pool, and the world’s largest community kitchen serves free meals to all visitors.',
    history:
      'Founded by Guru Arjan Dev in the 16th century, the temple enshrines the Adi Granth. Maharaja Ranjit Singh later overlaid the structure with gold and marble, giving it its iconic radiance.',
    travelGuide:
      'Amritsar’s Sri Guru Ram Dass Jee International Airport is 13 km away. Head coverings are mandatory and provided free of charge. Visit at dawn or after dusk for breathtaking reflections.',
    image: UNSPLASH('1588096344356-9b02fafabb09'),
    gallery: [
      UNSPLASH('1514222134-b57cbb8ce073'),
      UNSPLASH('1623059508779-2542c6e83753'),
      UNSPLASH('1609920658906-8223bd289001'),
      UNSPLASH('1567253186010-1c2c8b0c0c0f'),
    ],
    rating: 4.9,
    reviewCount: 21050,
    category: 'Sikh',
    state: 'Punjab',
    city: 'Amritsar',
    location: {
      lat: 31.62,
      lng: 74.8765,
      address: 'Golden Temple Rd, Amritsar, Punjab 143006',
    },
    timings: sampleTimings,
    popularity: 98,
    featured: true,
    deity: 'Guru Granth Sahib',
    established: '1604 CE',
    nearbyAttractions: [
      { name: 'Jallianwala Bagh', distance: '0.4 km', description: 'Historic memorial garden.' },
      { name: 'Wagah Border', distance: '28 km', description: 'Famous flag-lowering ceremony.' },
      { name: 'Durgiana Temple', distance: '1.8 km', description: 'Silver-doored Hindu temple.' },
    ],
    festivals: ['Guru Nanak Jayanti', 'Vaisakhi', 'Diwali'],
    faqs: sampleFaqs,
    reviews: sampleReviews,
  },
  {
    id: 't5',
    slug: 'tirupati-balaji',
    name: 'Sri Venkateswara Temple, Tirupati',
    shortDescription:
      'The world’s most visited shrine, perched on the seven sacred hills of Tirumala.',
    description:
      'The Sri Venkateswara Temple at Tirumala is dedicated to Lord Venkateswara, a form of Vishnu. Renowned for its laddu prasadam and elaborate rituals, it is among the richest and most visited temples on earth.',
    history:
      'Revered for over a thousand years and patronised by successive South Indian dynasties, the temple stands atop Tirumala, one of the seven hills representing the seven hoods of Adisesha.',
    travelGuide:
      'Tirupati Airport and railway station connect well to Chennai and Hyderabad. Book the Tirumala Tirupati Devasthanams (TTD) darshan online in advance to manage waiting times.',
    image: UNSPLASH('1606298855672-3efb63017be8'),
    gallery: [
      UNSPLASH('1582510003544-4d00b7f74220'),
      UNSPLASH('1604608672516-f1b9b1d37076'),
      UNSPLASH('1567253186010-1c2c8b0c0c0f'),
      UNSPLASH('1605649487212-47bdab064df7'),
    ],
    rating: 4.8,
    reviewCount: 33400,
    category: 'Vishnu',
    state: 'Andhra Pradesh',
    city: 'Tirumala',
    location: {
      lat: 13.6833,
      lng: 79.3474,
      address: 'Tirumala, Tirupati, Andhra Pradesh 517504',
    },
    timings: sampleTimings,
    popularity: 99,
    featured: true,
    deity: 'Lord Venkateswara',
    established: '300 CE',
    nearbyAttractions: [
      { name: 'Sri Padmavathi Temple', distance: '5 km', description: 'Temple of the consort goddess.' },
      { name: 'Akasaganga Teertham', distance: '3 km', description: 'Sacred mountain waterfall.' },
      { name: 'Silathoranam', distance: '2.5 km', description: 'Natural rock arch formation.' },
    ],
    festivals: ['Brahmotsavam', 'Vaikunta Ekadashi', 'Rathasapthami'],
    faqs: sampleFaqs,
    reviews: sampleReviews,
  },
  {
    id: 't6',
    slug: 'somnath-gujarat',
    name: 'Somnath Temple',
    shortDescription:
      'The first among the twelve Jyotirlingas, standing eternal against the Arabian Sea.',
    description:
      'The Somnath Temple is a resplendent seaside shrine to Lord Shiva, celebrated as the eternal temple that has been rebuilt many times across history. Its Chalukya-style architecture glows at sunset.',
    history:
      'Revered since antiquity and reconstructed multiple times after invasions, the modern temple was rebuilt in 1951. An arrow pillar on the temple marks the unobstructed sea route to Antarctica.',
    travelGuide:
      'Diu Airport (85 km) and Veraval railway station (7 km) are the nearest transit points. Attend the evening light-and-sound show that narrates the temple’s storied past.',
    image: UNSPLASH('1590050752117-238cb0fb12b1'),
    gallery: [
      UNSPLASH('1609920658906-8223bd289001'),
      UNSPLASH('1582510003544-4d00b7f74220'),
      UNSPLASH('1604608672516-f1b9b1d37076'),
      UNSPLASH('1567253186010-1c2c8b0c0c0f'),
    ],
    rating: 4.7,
    reviewCount: 9870,
    category: 'Shiva',
    state: 'Gujarat',
    city: 'Veraval',
    location: {
      lat: 20.888,
      lng: 70.4012,
      address: 'Somnath, Veraval, Gujarat 362268',
    },
    timings: sampleTimings,
    popularity: 88,
    featured: false,
    deity: 'Lord Shiva',
    established: 'Rebuilt 1951',
    nearbyAttractions: [
      { name: 'Bhalka Tirth', distance: '5 km', description: 'Sacred site associated with Krishna.' },
      { name: 'Triveni Sangam', distance: '2 km', description: 'Confluence of three rivers.' },
      { name: 'Gita Mandir', distance: '3 km', description: 'Temple inscribed with the Bhagavad Gita.' },
    ],
    festivals: ['Maha Shivratri', 'Kartik Purnima', 'Golokdham Utsav'],
    faqs: sampleFaqs,
    reviews: sampleReviews,
  },
  {
    id: 't7',
    slug: 'jagannath-puri',
    name: 'Jagannath Temple, Puri',
    shortDescription:
      'Home of the world-famous Rath Yatra and the divine triad of Lord Jagannath.',
    description:
      'The Jagannath Temple in Puri is a major Char Dham pilgrimage site, famous for its annual Rath Yatra in which colossal chariots carry the deities through the streets amid a sea of devotees.',
    history:
      'Built in the 12th century by King Anantavarman Chodaganga Deva, the temple is renowned for its Kalinga architecture, its flag that always flutters against the wind, and its mysterious shadowless tower.',
    travelGuide:
      'Bhubaneswar Airport (60 km) and Puri railway station (3 km) serve the town. Non-Hindus may view the temple from the nearby Raghunandan Library rooftop.',
    image: UNSPLASH('1605649487212-47bdab064df7'),
    gallery: [
      UNSPLASH('1582510003544-4d00b7f74220'),
      UNSPLASH('1609920658906-8223bd289001'),
      UNSPLASH('1604608672516-f1b9b1d37076'),
      UNSPLASH('1567253186010-1c2c8b0c0c0f'),
    ],
    rating: 4.8,
    reviewCount: 14200,
    category: 'Vishnu',
    state: 'Odisha',
    city: 'Puri',
    location: {
      lat: 19.8048,
      lng: 85.8181,
      address: 'Grand Road, Puri, Odisha 752001',
    },
    timings: sampleTimings,
    popularity: 90,
    featured: false,
    deity: 'Lord Jagannath',
    established: '12th Century CE',
    nearbyAttractions: [
      { name: 'Puri Beach', distance: '2 km', description: 'Golden sands on the Bay of Bengal.' },
      { name: 'Konark Sun Temple', distance: '35 km', description: 'UNESCO World Heritage Site.' },
      { name: 'Chilika Lake', distance: '50 km', description: "Asia’s largest brackish lagoon." },
    ],
    festivals: ['Rath Yatra', 'Snana Yatra', 'Chandan Yatra'],
    faqs: sampleFaqs,
    reviews: sampleReviews,
  },
  {
    id: 't8',
    slug: 'siddhivinayak-mumbai',
    name: 'Shree Siddhivinayak Temple',
    shortDescription:
      'Mumbai’s most beloved Ganesha temple, radiant with gold and devotion.',
    description:
      'The Shree Siddhivinayak Temple is dedicated to Lord Ganesha and is one of the richest temples in Mumbai. Its inner roof is plated with gold and the central idol is carved from a single black stone.',
    history:
      'Built in 1801, the small original shrine has grown into a magnificent multi-tiered complex. Devotees from all walks of life, including celebrities, throng here especially on Tuesdays.',
    travelGuide:
      'Located in Prabhadevi, the temple is well connected by Mumbai’s local trains and metro. Tuesday darshan sees the largest crowds; weekday mornings are calmer.',
    image: UNSPLASH('1567253186010-1c2c8b0c0c0f'),
    gallery: [
      UNSPLASH('1609920658906-8223bd289001'),
      UNSPLASH('1582510003544-4d00b7f74220'),
      UNSPLASH('1604608672516-f1b9b1d37076'),
      UNSPLASH('1605649487212-47bdab064df7'),
    ],
    rating: 4.7,
    reviewCount: 11600,
    category: 'Ganesha',
    state: 'Maharashtra',
    city: 'Mumbai',
    location: {
      lat: 19.0167,
      lng: 72.8302,
      address: 'SK Bole Marg, Prabhadevi, Mumbai 400028',
    },
    timings: sampleTimings,
    popularity: 86,
    featured: false,
    deity: 'Lord Ganesha',
    established: '1801 CE',
    nearbyAttractions: [
      { name: 'Mahalakshmi Temple', distance: '4 km', description: 'Seaside temple of the goddess of wealth.' },
      { name: 'Worli Sea Face', distance: '5 km', description: 'Scenic promenade by the sea.' },
      { name: 'Haji Ali Dargah', distance: '6 km', description: 'Iconic offshore shrine.' },
    ],
    festivals: ['Ganesh Chaturthi', 'Angarki Chaturthi', 'Maghi Ganeshotsav'],
    faqs: sampleFaqs,
    reviews: sampleReviews,
  },
];
