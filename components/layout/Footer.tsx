import Link from 'next/link';
import { FaFacebookF, FaInstagram, FaYoutube, FaXTwitter } from 'react-icons/fa6';
import { FiMapPin, FiPhone, FiMail, FiSend } from 'react-icons/fi';
import { GiLotusFlower } from 'react-icons/gi';
import { siteConfig, footerLinks } from '@/lib/config';
import Particles from '@/components/ui/Particles';

const socials = [
  { icon: FaFacebookF, href: siteConfig.social.facebook, label: 'Facebook' },
  { icon: FaInstagram, href: siteConfig.social.instagram, label: 'Instagram' },
  { icon: FaYoutube, href: siteConfig.social.youtube, label: 'YouTube' },
  { icon: FaXTwitter, href: siteConfig.social.twitter, label: 'X' },
];

export default function Footer() {
  return (
    <footer className="relative overflow-hidden bg-royal-950 text-white">
      <Particles count={14} color="bg-gold-400/30" />
      <div className="absolute inset-x-0 top-0 h-1 bg-gold-shine" />

      <div className="container relative grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-saffron-500 to-gold-500 text-white">
              <GiLotusFlower className="text-2xl" />
            </span>
            <span className="font-display text-xl font-bold">
              Ayodhya<span className="text-gold-400"> Tirtham</span>
            </span>
          </div>
          <p className="mt-5 text-sm leading-relaxed text-white/70">{siteConfig.description}</p>
          <div className="mt-6 flex gap-3">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="grid h-10 w-10 place-items-center rounded-full bg-white/10 transition-colors hover:bg-gold-500"
              >
                <s.icon />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-5 text-lg font-bold text-gold-400">Explore</h3>
          <ul className="space-y-3">
            {footerLinks.explore.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-sm text-white/70 transition-colors hover:text-gold-300">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-5 text-lg font-bold text-gold-400">Company</h3>
          <ul className="space-y-3">
            {footerLinks.company.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-sm text-white/70 transition-colors hover:text-gold-300">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-5 text-lg font-bold text-gold-400">Get in Touch</h3>
          <ul className="space-y-4 text-sm text-white/70">
            <li className="flex gap-3">
              <FiMapPin className="mt-0.5 shrink-0 text-gold-400" /> {siteConfig.contact.address}
            </li>
            <li className="flex gap-3">
              <FiPhone className="shrink-0 text-gold-400" /> {siteConfig.contact.phone}
            </li>
            <li className="flex gap-3">
              <FiMail className="shrink-0 text-gold-400" /> {siteConfig.contact.email}
            </li>
          </ul>

          <form className="mt-6">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/60">
              Newsletter
            </label>
            <div className="flex overflow-hidden rounded-full bg-white/10 p-1">
              <input
                type="email"
                required
                placeholder="Your email"
                className="flex-1 bg-transparent px-4 text-sm outline-none placeholder:text-white/40"
              />
              <button
                type="submit"
                aria-label="Subscribe"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-saffron-500 to-gold-500"
              >
                <FiSend />
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="relative border-t border-white/10">
        <div className="container flex flex-col items-center justify-between gap-3 py-6 text-center text-sm text-white/50 md:flex-row md:text-left">
          <p>
            © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
          </p>
          <p>Crafted with devotion for pilgrims worldwide.</p>
        </div>
      </div>
    </footer>
  );
}
