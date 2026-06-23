'use client';

import { useState } from 'react';
import { FiSend, FiCheckCircle } from 'react-icons/fi';

export default function ContactForm() {
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div className="grid place-items-center rounded-3xl bg-white p-10 text-center shadow-glass">
        <FiCheckCircle className="text-6xl text-green-500" />
        <h3 className="mt-4 text-2xl font-bold text-royal-950">Message Sent!</h3>
        <p className="mt-2 text-royal-900/60">
          Thank you for reaching out. Our team will respond within 24 hours.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setSent(true);
      }}
      className="rounded-3xl bg-white p-7 shadow-glass ring-1 ring-royal-900/5 md:p-9"
    >
      <h2 className="text-2xl font-bold text-royal-950">Send Us a Message</h2>
      <p className="mt-1 text-sm text-royal-900/60">We would love to help plan your journey.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <input required placeholder="First name" className="rounded-xl bg-gold-50 px-4 py-3 text-sm outline-none ring-1 ring-royal-900/10 focus:ring-gold-400" />
        <input required placeholder="Last name" className="rounded-xl bg-gold-50 px-4 py-3 text-sm outline-none ring-1 ring-royal-900/10 focus:ring-gold-400" />
        <input required type="email" placeholder="Email" className="rounded-xl bg-gold-50 px-4 py-3 text-sm outline-none ring-1 ring-royal-900/10 focus:ring-gold-400" />
        <input required type="tel" placeholder="Phone" className="rounded-xl bg-gold-50 px-4 py-3 text-sm outline-none ring-1 ring-royal-900/10 focus:ring-gold-400" />
      </div>
      <input placeholder="Subject" className="mt-4 w-full rounded-xl bg-gold-50 px-4 py-3 text-sm outline-none ring-1 ring-royal-900/10 focus:ring-gold-400" />
      <textarea
        required
        rows={5}
        placeholder="Your message"
        className="mt-4 w-full resize-none rounded-xl bg-gold-50 px-4 py-3 text-sm outline-none ring-1 ring-royal-900/10 focus:ring-gold-400"
      />
      <button
        type="submit"
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-saffron-500 to-gold-500 py-3.5 font-semibold text-white shadow-gold transition-all hover:shadow-gold-lg"
      >
        <FiSend /> Send Message
      </button>
    </form>
  );
}
