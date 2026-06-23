import type { GalleryImage } from '@/types';

const u = (id: string, w = 800) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

const ids = [
  '1609920658906-8223bd289001',
  '1561361513-2d000a50f0dc',
  '1621996346565-e3dbc646d9a9',
  '1588096344356-9b02fafabb09',
  '1606298855672-3efb63017be8',
  '1590050752117-238cb0fb12b1',
  '1605649487212-47bdab064df7',
  '1567253186010-1c2c8b0c0c0f',
  '1582510003544-4d00b7f74220',
  '1604608672516-f1b9b1d37076',
  '1574236170880-f22433e8d3c5',
  '1599661046289-e31897846e41',
  '1567427017947-545c5f8d16ad',
  '1596402184320-417e7178b2cd',
  '1623059508779-2542c6e83753',
];

const categories = ['Temples', 'Festivals', 'Rituals', 'Architecture', 'Pilgrims'];

// Deterministic dimensions keep the masonry layout stable between renders.
const heights = [600, 800, 500, 700, 900, 550, 750, 650, 820, 580, 720, 640, 880, 520, 760];

export const galleryImages: GalleryImage[] = ids.map((id, i) => ({
  id: `g${i + 1}`,
  src: u(id),
  alt: `${categories[i % categories.length]} of sacred India ${i + 1}`,
  category: categories[i % categories.length],
  width: 800,
  height: heights[i],
}));

export const galleryCategories = ['All', ...categories];
