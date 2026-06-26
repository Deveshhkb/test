'use client';

import { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';

export default function Newsletter() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (email.includes('@')) setDone(true);
      }}
      className="mt-6"
    >
      <p className="mb-2 text-sm font-semibold text-white/80">Get 10% off your first order</p>
      {done ? (
        <p className="flex items-center gap-2 text-sm text-nova-300">
          <Check className="h-4 w-4" /> You&apos;re subscribed. Welcome to NovaStyle!
        </p>
      ) : (
        <div className="flex max-w-sm overflow-hidden rounded-full bg-white/10 p-1">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            className="flex-1 bg-transparent px-4 text-sm text-white placeholder:text-white/40 outline-none"
          />
          <button
            type="submit"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-nova-600 transition hover:bg-nova-500"
            aria-label="Subscribe"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </form>
  );
}
