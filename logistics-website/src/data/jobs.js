import {
  FaHeartbeat,
  FaGraduationCap,
  FaPlaneDeparture,
  FaPiggyBank,
  FaUsers,
  FaClock,
} from 'react-icons/fa';

export const jobs = [
  {
    id: 'cdl-driver',
    title: 'CDL Class A Truck Driver',
    department: 'Fleet Operations',
    location: 'Long Beach, CA',
    type: 'Full-time',
    description:
      'Operate long-haul tractor units across regional and interstate routes while upholding our on-time and safety standards.',
  },
  {
    id: 'logistics-coordinator',
    title: 'Logistics Coordinator',
    department: 'Operations',
    location: 'Dallas, TX',
    type: 'Full-time',
    description:
      'Coordinate multi-modal shipments, liaise with carriers and customers, and keep our tracking data accurate end-to-end.',
  },
  {
    id: 'warehouse-supervisor',
    title: 'Warehouse Supervisor',
    department: 'Warehousing',
    location: 'Newark, NJ',
    type: 'Full-time',
    description:
      'Lead a fulfilment team, manage inventory accuracy and drive continuous improvement across pick-pack-ship workflows.',
  },
  {
    id: 'freight-forwarder',
    title: 'International Freight Forwarder',
    department: 'Global Freight',
    location: 'Remote (US)',
    type: 'Full-time',
    description:
      'Manage air and sea freight bookings, customs documentation and partner relationships for international trade lanes.',
  },
  {
    id: 'fleet-mechanic',
    title: 'Diesel Fleet Mechanic',
    department: 'Maintenance',
    location: 'Long Beach, CA',
    type: 'Full-time',
    description:
      'Inspect, diagnose and repair our heavy-duty fleet to keep vehicles safe, compliant and on the road.',
  },
  {
    id: 'customer-success',
    title: 'Customer Success Specialist',
    department: 'Customer Experience',
    location: 'Hybrid — Atlanta, GA',
    type: 'Full-time',
    description:
      'Be the trusted point of contact for key accounts, resolving queries and proactively improving the shipping experience.',
  },
];

export const benefits = [
  { id: 1, Icon: FaHeartbeat, title: 'Health & Wellness', text: 'Comprehensive medical, dental and vision coverage for you and your family.' },
  { id: 2, Icon: FaPiggyBank, title: '401(k) Matching', text: 'Plan for the future with a generous company-matched retirement plan.' },
  { id: 3, Icon: FaGraduationCap, title: 'Learning & Growth', text: 'Funded certifications, training programs and clear career progression.' },
  { id: 4, Icon: FaPlaneDeparture, title: 'Paid Time Off', text: 'Generous PTO, paid holidays and parental leave to recharge and reset.' },
  { id: 5, Icon: FaUsers, title: 'Inclusive Culture', text: 'A diverse, supportive team where every voice is heard and valued.' },
  { id: 6, Icon: FaClock, title: 'Flexible Scheduling', text: 'Hybrid and flexible options for eligible roles to fit your life.' },
];
