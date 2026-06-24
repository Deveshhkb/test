'use client';

import { FaWhatsapp, FaPhoneAlt } from 'react-icons/fa';

const WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '919999999999';
const PHONE = process.env.NEXT_PUBLIC_CONTACT_PHONE || '+919999999999';

/** Floating WhatsApp + Call buttons present on every page. */
export default function FloatingContact() {
  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col gap-3">
      <a
        href={`https://wa.me/${WHATSAPP}?text=Hari%20Om!%20I%20want%20to%20plan%20a%20pilgrimage.`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:scale-110 animate-float"
      >
        <FaWhatsapp className="h-6 w-6" />
      </a>
      <a
        href={`tel:${PHONE}`}
        aria-label="Call us"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-lg transition hover:scale-110"
      >
        <FaPhoneAlt className="h-5 w-5" />
      </a>
    </div>
  );
}
