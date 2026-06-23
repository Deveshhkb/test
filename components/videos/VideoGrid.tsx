'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { FiPlay, FiClock } from 'react-icons/fi';
import type { VideoItem } from '@/types';
import { videoCategories } from '@/lib/data/videos';
import VideoModal from '@/components/media/VideoModal';
import { cn } from '@/utils';

export default function VideoGrid({ videos }: { videos: VideoItem[] }) {
  const [filter, setFilter] = useState('All');
  const [active, setActive] = useState<VideoItem | null>(null);

  const filtered = useMemo(
    () => (filter === 'All' ? videos : videos.filter((v) => v.category === filter)),
    [filter, videos],
  );

  return (
    <section className="section">
      <div className="container">
        <div className="mb-10 flex flex-wrap justify-center gap-3">
          {videoCategories.map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={cn(
                'rounded-full px-5 py-2 text-sm font-semibold transition-colors',
                filter === c
                  ? 'bg-gradient-to-r from-saffron-500 to-gold-500 text-white shadow-gold'
                  : 'bg-white text-royal-900 ring-1 ring-royal-900/10 hover:bg-gold-50',
              )}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((video, i) => (
            <motion.button
              key={video.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: (i % 3) * 0.1 }}
              onClick={() => setActive(video)}
              className="group overflow-hidden rounded-3xl bg-white text-left shadow-glass ring-1 ring-royal-900/5 transition-all hover:-translate-y-1 hover:shadow-gold-lg"
            >
              <div className="relative aspect-video overflow-hidden">
                <Image
                  src={`https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg`}
                  alt={video.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-royal-950/30 transition-colors group-hover:bg-royal-950/10" />
                <span className="absolute left-1/2 top-1/2 grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-xl text-saffron-600 shadow-lg transition-transform group-hover:scale-110">
                  <FiPlay className="ml-0.5" />
                </span>
                <span className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-royal-950/70 px-2.5 py-1 text-xs font-semibold text-white">
                  <FiClock /> {video.duration}
                </span>
              </div>
              <div className="p-5">
                <span className="text-xs font-bold uppercase tracking-wider text-gold-600">{video.category}</span>
                <h3 className="mt-1 font-bold text-royal-950">{video.title}</h3>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      <VideoModal video={active} onClose={() => setActive(null)} />
    </section>
  );
}
