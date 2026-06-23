import type { VideoItem } from '@/types';

// Note: youtubeId values are well-known public devotional/travel clips used as
// placeholders for the demo. Swap with your channel's content in production.
export const videos: VideoItem[] = [
  { id: 'v1', title: 'Aerial Tour of Ayodhya Dham', youtubeId: 'ScMzIvxBSi4', category: 'Aerial', duration: '4:21' },
  { id: 'v2', title: 'Ganga Aarti at Varanasi', youtubeId: 'aqz-KE-bpKQ', category: 'Rituals', duration: '6:05' },
  { id: 'v3', title: 'Inside Meenakshi Temple', youtubeId: 'ScMzIvxBSi4', category: 'Architecture', duration: '8:14' },
  { id: 'v4', title: 'Golden Temple at Night', youtubeId: 'aqz-KE-bpKQ', category: 'Aerial', duration: '3:47' },
  { id: 'v5', title: 'Tirumala Brahmotsavam Highlights', youtubeId: 'ScMzIvxBSi4', category: 'Festivals', duration: '5:32' },
  { id: 'v6', title: 'Rath Yatra Puri 2025', youtubeId: 'aqz-KE-bpKQ', category: 'Festivals', duration: '7:19' },
  { id: 'v7', title: 'Sunrise on the Sarayu', youtubeId: 'ScMzIvxBSi4', category: 'Aerial', duration: '2:58' },
  { id: 'v8', title: 'Devotional Bhajan Sandhya', youtubeId: 'aqz-KE-bpKQ', category: 'Rituals', duration: '9:42' },
];

export const videoCategories = ['All', 'Aerial', 'Rituals', 'Architecture', 'Festivals'];
