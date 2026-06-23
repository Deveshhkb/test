import type { Testimonial, Stat, Destination, FAQ } from '@/types';

const avatar = (s: number) => `https://i.pravatar.cc/120?img=${s}`;
const u = (id: string, w = 900) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

export const testimonials: Testimonial[] = [
  {
    id: 'ts1',
    name: 'Lakshmi Narayanan',
    role: 'Pilgrim, Chennai',
    avatar: avatar(16),
    rating: 5,
    quote:
      'Ayodhya Tirtham arranged our entire darshan flawlessly. From VIP entry to the riverside aarti, every detail was divine.',
  },
  {
    id: 'ts2',
    name: 'Harpreet Singh',
    role: 'Devotee, Delhi',
    avatar: avatar(8),
    rating: 5,
    quote:
      'The Char Dham package was beautifully organised. The guides were knowledgeable and the comfort exceeded expectations.',
  },
  {
    id: 'ts3',
    name: 'Sneha Patel',
    role: 'Traveller, Ahmedabad',
    avatar: avatar(47),
    rating: 4,
    quote:
      'A truly premium experience. The app made it easy to plan timings and the wellness retreat was deeply rejuvenating.',
  },
  {
    id: 'ts4',
    name: 'Venkatesh Rao',
    role: 'Pilgrim, Hyderabad',
    avatar: avatar(51),
    rating: 5,
    quote:
      'Tirupati darshan without the endless wait — they handled everything. Highly recommended for senior citizens too.',
  },
];

export const stats: Stat[] = [
  { id: 's1', label: 'Sacred Temples', value: 1200, suffix: '+', icon: 'temple' },
  { id: 's2', label: 'Happy Pilgrims', value: 250000, suffix: '+', icon: 'users' },
  { id: 's3', label: 'Yatras Organised', value: 8500, suffix: '+', icon: 'route' },
  { id: 's4', label: 'Years of Service', value: 18, suffix: '', icon: 'award' },
];

export const destinations: Destination[] = [
  {
    id: 'd1',
    name: 'Ayodhya',
    state: 'Uttar Pradesh',
    image: u('1604608672516-f1b9b1d37076'),
    templeCount: 48,
    description: 'The sacred birthplace of Lord Rama.',
  },
  {
    id: 'd2',
    name: 'Varanasi',
    state: 'Uttar Pradesh',
    image: u('1561361513-2d000a50f0dc'),
    templeCount: 96,
    description: 'The eternal city on the Ganga.',
  },
  {
    id: 'd3',
    name: 'Tirupati',
    state: 'Andhra Pradesh',
    image: u('1606298855672-3efb63017be8'),
    templeCount: 22,
    description: 'Abode of Lord Venkateswara.',
  },
  {
    id: 'd4',
    name: 'Madurai',
    state: 'Tamil Nadu',
    image: u('1621996346565-e3dbc646d9a9'),
    templeCount: 34,
    description: 'City of the Meenakshi temple.',
  },
  {
    id: 'd5',
    name: 'Amritsar',
    state: 'Punjab',
    image: u('1588096344356-9b02fafabb09'),
    templeCount: 18,
    description: 'Home of the Golden Temple.',
  },
  {
    id: 'd6',
    name: 'Puri',
    state: 'Odisha',
    image: u('1605649487212-47bdab064df7'),
    templeCount: 27,
    description: 'Land of Lord Jagannath.',
  },
];

export const homeFaqs: FAQ[] = [
  {
    question: 'How do I book a pilgrimage package?',
    answer:
      'Simply browse our packages, choose the one that suits you, and fill in the booking form. Our team will reach out within 24 hours to confirm details and customise your journey.',
  },
  {
    question: 'Do you arrange VIP darshan and special poojas?',
    answer:
      'Yes. We have official tie-ups with major temple trusts to arrange priority darshan, sevas and special poojas wherever permitted.',
  },
  {
    question: 'Are your packages suitable for senior citizens?',
    answer:
      'Absolutely. We offer comfortable transport, wheelchair assistance, ground-floor stays and medical support to ensure a hassle-free experience for elders.',
  },
  {
    question: 'Can I customise an itinerary?',
    answer:
      'Every itinerary is fully customisable. Tell us your preferred temples, dates and budget, and we will craft a bespoke spiritual journey for you.',
  },
  {
    question: 'What is your cancellation policy?',
    answer:
      'Cancellations made 15 days before departure receive a full refund minus processing fees. Please refer to each package for specific terms.',
  },
];
