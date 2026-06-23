'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { FiPlay } from 'react-icons/fi';
import type { VideoItem } from '@/types';
import { fadeUp, staggerContainer, viewport } from '@/lib/animations';
import SectionHeading from '@/components/ui/SectionHeading';
import VideoModal from '@/components/media/VideoModal';

export default function VideoShowcase({ videos }: { videos: VideoItem[] }) {
  const [active, setActive] = useState<VideoItem | null>(null);
  const list = videos.slice(0, 4);

  return (
    <section className="section bg-gradient-to-b from-white to-gold-50">
      <div className="container">
        <SectionHeading
          eyebrow="Visual Darshan"
          title="Experience It in Motion"
          subtitle="Immerse yourself in the sights and sounds of India’s most sacred places."
        />

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          {list.map((video) => (
            <motion.button
              key={video.id}
              variants={fadeUp}
              onClick={() => setActive(video)}
              className="group relative aspect-video overflow-hidden rounded-2xl shadow-glass"
            >
              <Image
                src={`https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg`}
                alt={video.title}
                fill
                sizes="(max-width: 768px) 100vw, 25vw"
                className="object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-royal-950/40 transition-colors group-hover:bg-royal-950/20" />
              <span className="absolute left-1/2 top-1/2 grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-xl text-saffron-600 shadow-lg transition-transform group-hover:scale-110">
                <FiPlay className="ml-0.5" />
              </span>
              <span className="absolute bottom-3 left-3 right-3 text-left text-sm font-semibold text-white text-shadow-lg">
                {video.title}
              </span>
            </motion.button>
          ))}
        </motion.div>
      </div>

      <VideoModal video={active} onClose={() => setActive(null)} />
    </section>
  );
}
