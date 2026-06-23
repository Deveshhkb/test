'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FiPlus } from 'react-icons/fi';
import type { FAQ } from '@/types';
import { cn } from '@/utils';

export default function Accordion({ items, className }: { items: FAQ[]; className?: string }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className={cn('space-y-4', className)}>
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div
            key={i}
            className={cn(
              'overflow-hidden rounded-2xl border transition-colors',
              isOpen ? 'border-gold-300 bg-white shadow-glass' : 'border-royal-900/10 bg-white/60',
            )}
          >
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <span className="font-semibold text-royal-950">{item.question}</span>
              <span
                className={cn(
                  'grid h-8 w-8 shrink-0 place-items-center rounded-full transition-all duration-300',
                  isOpen ? 'rotate-45 bg-gradient-to-br from-saffron-500 to-gold-500 text-white' : 'bg-gold-100 text-gold-600',
                )}
              >
                <FiPlus />
              </span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <p className="px-5 pb-5 text-sm leading-relaxed text-royal-900/70">{item.answer}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
