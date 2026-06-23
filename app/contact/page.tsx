import type { Metadata } from 'next';
import { FiMapPin, FiPhone, FiMail, FiClock } from 'react-icons/fi';
import { FaFacebookF, FaInstagram, FaYoutube, FaXTwitter } from 'react-icons/fa6';
import { siteConfig } from '@/lib/config';
import PageHero from '@/components/ui/PageHero';
import ContactForm from '@/components/contact/ContactForm';

export const metadata: Metadata = {
  title: 'Contact Us',
  description:
    'Get in touch with Ayodhya Tirtham to plan your pilgrimage. Reach us by phone, email or visit our office in Ayodhya.',
  alternates: { canonical: '/contact' },
};

const details = [
  { icon: FiMapPin, label: 'Office', value: siteConfig.contact.address },
  { icon: FiPhone, label: 'Phone', value: siteConfig.contact.phone },
  { icon: FiMail, label: 'Email', value: siteConfig.contact.email },
  { icon: FiClock, label: 'Hours', value: 'Mon – Sat · 9:00 AM – 7:00 PM IST' },
];

const socials = [
  { icon: FaFacebookF, href: siteConfig.social.facebook, label: 'Facebook' },
  { icon: FaInstagram, href: siteConfig.social.instagram, label: 'Instagram' },
  { icon: FaYoutube, href: siteConfig.social.youtube, label: 'YouTube' },
  { icon: FaXTwitter, href: siteConfig.social.twitter, label: 'X' },
];

export default function ContactPage() {
  return (
    <>
      <PageHero
        title="Contact Us"
        subtitle="We are here to guide your sacred journey, every step of the way."
        crumbs={[{ label: 'Contact' }]}
        image="https://images.unsplash.com/photo-1605649487212-47bdab064df7?auto=format&fit=crop&w=1920&q=80"
      />

      <section className="section">
        <div className="container grid gap-10 lg:grid-cols-[1fr_1.1fr]">
          {/* Details */}
          <div>
            <div className="grid gap-4 sm:grid-cols-2">
              {details.map((d) => (
                <div key={d.label} className="rounded-2xl bg-gold-50 p-5">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-saffron-500 to-gold-500 text-xl text-white">
                    <d.icon />
                  </span>
                  <p className="mt-3 text-xs font-bold uppercase tracking-wider text-royal-900/50">{d.label}</p>
                  <p className="mt-0.5 text-sm font-medium text-royal-950">{d.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <p className="mb-3 text-sm font-semibold text-royal-900/60">Follow us</p>
              <div className="flex gap-3">
                {socials.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="grid h-11 w-11 place-items-center rounded-full bg-royal-950 text-white transition-colors hover:bg-gold-500"
                  >
                    <s.icon />
                  </a>
                ))}
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl ring-1 ring-royal-900/10">
              <iframe
                src="https://maps.google.com/maps?q=26.7956,82.1943&z=13&output=embed"
                title="Office location"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="h-72 w-full border-0"
              />
            </div>
          </div>

          <ContactForm />
        </div>
      </section>
    </>
  );
}
