import Link from 'next/link';
import Newsletter from './Newsletter';

const COLUMNS = [
  {
    title: 'Shop',
    links: [
      { label: 'Men', href: '/men' },
      { label: 'Women', href: '/women' },
      { label: 'Footwear', href: '/footwear' },
      { label: 'Accessories', href: '/accessories' },
      { label: 'New Arrivals', href: '/collections/new-arrivals' },
    ],
  },
  {
    title: 'Help',
    links: [
      { label: 'Track Order', href: '/account/orders' },
      { label: 'Shipping & Returns', href: '/page/shipping-returns' },
      { label: 'FAQs', href: '/page/shipping-returns' },
      { label: 'Contact Us', href: '/page/about' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About Us', href: '/page/about' },
      { label: 'Privacy Policy', href: '/page/privacy' },
      { label: 'Terms of Service', href: '/page/terms' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-ink/10 bg-ink text-white">
      <div className="container-nova grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <span className="text-2xl font-black">
            Nova<span className="text-nova-400">Style</span>
          </span>
          <p className="mt-3 max-w-sm text-sm text-white/60">
            Original, trend-forward fashion designed in-house. Built for comfort,
            made to stand out.
          </p>
          <Newsletter />
        </div>

        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wide text-white/80">
              {col.title}
            </h4>
            <ul className="space-y-2.5">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="text-sm text-white/55 transition hover:text-white">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-white/10">
        <div className="container-nova flex flex-col items-center justify-between gap-3 py-5 text-xs text-white/50 sm:flex-row">
          <p>© {new Date().getFullYear()} NovaStyle. All rights reserved.</p>
          <p>Secure payments via Razorpay · UPI · Cards · Net Banking</p>
        </div>
      </div>
    </footer>
  );
}
