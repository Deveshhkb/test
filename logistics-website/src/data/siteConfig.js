import {
  FaFacebookF,
  FaTwitter,
  FaLinkedinIn,
  FaInstagram,
  FaYoutube,
} from 'react-icons/fa';

export const company = {
  name: 'SwiftLane Logistics',
  tagline: 'Moving Your World Forward',
  phone: '+1 (800) 742-9356',
  email: 'support@swiftlane-logistics.com',
  address: '4820 Harbor Gateway Blvd, Long Beach, CA 90802, USA',
  workingHours: [
    { day: 'Monday – Friday', hours: '7:00 AM – 8:00 PM' },
    { day: 'Saturday', hours: '8:00 AM – 5:00 PM' },
    { day: 'Sunday', hours: 'Emergency dispatch only' },
  ],
};

export const navLinks = [
  { label: 'Home', path: '/' },
  { label: 'About', path: '/about' },
  { label: 'Services', path: '/services' },
  { label: 'Fleet', path: '/fleet' },
  { label: 'Tracking', path: '/tracking' },
  { label: 'Careers', path: '/careers' },
  { label: 'Contact', path: '/contact' },
];

export const socialLinks = [
  { label: 'Facebook', href: 'https://facebook.com', Icon: FaFacebookF },
  { label: 'Twitter', href: 'https://twitter.com', Icon: FaTwitter },
  { label: 'LinkedIn', href: 'https://linkedin.com', Icon: FaLinkedinIn },
  { label: 'Instagram', href: 'https://instagram.com', Icon: FaInstagram },
  { label: 'YouTube', href: 'https://youtube.com', Icon: FaYoutube },
];
