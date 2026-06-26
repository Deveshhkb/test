'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Heart,
  ShoppingBag,
  User,
  Menu,
  X,
  ChevronDown,
  Tag,
  Sparkles,
  Shirt,
  Footprints,
  Wind,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import SearchOverlay from './SearchOverlay';

interface MegaLink {
  label: string;
  href: string;
}
interface MegaColumn {
  title: string;
  links: MegaLink[];
}
interface Special {
  label: string;
  href: string;
  icon: LucideIcon;
}
interface NavItem {
  label: string;
  href: string;
  columns?: MegaColumn[];
  specials?: Special[];
}

// Build a category page link with an optional sub-category query.
const sub = (base: string, q: string): MegaLink => ({
  label: q,
  href: `/${base}?sub=${encodeURIComponent(q.toLowerCase())}`,
});

const SPECIALS: Special[] = [
  { label: 'Clearance Store', href: '/collections/best-sellers', icon: Tag },
  { label: 'Buy 3 @ ₹1199', href: '/collections/trending', icon: Shirt },
  { label: 'Buy 2 @ ₹1199', href: '/collections/trending', icon: Sparkles },
  { label: 'Sneaker Drop', href: '/footwear', icon: Footprints },
  { label: 'NovaAir Light', href: '/collections/new-arrivals', icon: Wind },
];

const NAV: NavItem[] = [
  {
    label: 'Men',
    href: '/men',
    columns: [
      {
        title: 'Topwear',
        links: ['All Topwear', 'T-Shirts', 'Shirts', 'Polo T-Shirts', 'Oversized T-Shirts', 'Printed T-Shirts', 'Vests', 'Hoodies'].map((q) => sub('men', q)),
      },
      {
        title: 'Bottomwear',
        links: ['All Bottomwear', 'Joggers', 'Trackpants', 'Trousers & Pants', 'Jeans', 'Shorts', 'Boxers', 'Cargos'].map((q) => sub('men', q)),
      },
      {
        title: 'Winterwear',
        links: ['All Winterwear', 'Hoodies', 'Sweatshirts', 'Jackets', 'Sweaters', 'Co-ord Sets', 'Plus Size'].map((q) => sub('men', q)),
      },
      {
        title: 'Innerwear & Loungewear',
        links: ['All Loungewear', 'Vests', 'Joggers', 'Pajamas', 'Shorts', 'Boxers'].map((q) => sub('men', q)),
      },
    ],
    specials: SPECIALS,
  },
  {
    label: 'Women',
    href: '/women',
    columns: [
      {
        title: 'Topwear',
        links: ['All Topwear', 'Tops', 'T-Shirts', 'Crop Tops', 'Dresses', 'Co-ords', 'Oversized T-Shirts'].map((q) => sub('women', q)),
      },
      {
        title: 'Bottomwear',
        links: ['All Bottomwear', 'Jeans', 'Skirts', 'Trousers', 'Joggers', 'Shorts', 'Leggings'].map((q) => sub('women', q)),
      },
      {
        title: 'Winterwear',
        links: ['All Winterwear', 'Hoodies', 'Sweatshirts', 'Jackets', 'Sweaters', 'Co-ord Sets'].map((q) => sub('women', q)),
      },
      {
        title: 'Innerwear & Loungewear',
        links: ['All Loungewear', 'Camisoles', 'Pajamas', 'Shorts', 'Lounge Sets'].map((q) => sub('women', q)),
      },
    ],
    specials: SPECIALS,
  },
  {
    label: 'Accessories',
    href: '/accessories',
    columns: [
      {
        title: 'Bags & Backpacks',
        links: ['All Bags', 'Backpacks', 'Sling Bags', 'Laptop Bags'].map((q) => sub('accessories', q)),
      },
      {
        title: 'Personal',
        links: ['Watches', 'Sunglasses', 'Caps', 'Wallets', 'Socks'].map((q) => sub('accessories', q)),
      },
    ],
  },
  { label: 'Footwear', href: '/footwear' },
  { label: 'New Arrivals', href: '/collections/new-arrivals' },
  { label: 'Best Sellers', href: '/collections/best-sellers' },
];

export default function Header() {
  const router = useRouter();
  const { summary, setOpen } = useCart();
  const { ids } = useWishlist();
  const { user, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      {/* Announcement bar */}
      <div className="bg-ink text-white">
        <div className="container-nova flex h-9 items-center justify-center overflow-hidden text-xs font-medium">
          <span className="truncate">
            ✨ Free shipping over ₹999 · Use code <strong>NOVA10</strong> for 10% off
          </span>
        </div>
      </div>

      <header
        className={cn(
          'sticky top-0 z-50 border-b bg-white/90 backdrop-blur transition-shadow',
          scrolled ? 'border-ink/10 shadow-sm' : 'border-transparent'
        )}
      >
        <div className="container-nova flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </button>
            <Link href="/" className="text-2xl font-black tracking-tight">
              Nova<span className="text-nova-600">Style</span>
            </Link>
          </div>

          {/* Desktop nav with mega menu */}
          <nav className="hidden items-center gap-1 lg:flex">
            {NAV.map((item) => (
              <div key={item.label} className="group relative">
                <Link
                  href={item.href}
                  className="flex items-center gap-1 rounded-full px-3 py-2 text-sm font-semibold text-ink/80 transition hover:bg-ink/5 hover:text-ink"
                >
                  {item.label}
                  {item.columns && <ChevronDown className="h-3.5 w-3.5" />}
                </Link>
                {item.columns && (
                  <div
                    className={cn(
                      'invisible absolute left-1/2 top-full z-50 -translate-x-1/2 pt-3 opacity-0 transition-all duration-200 group-hover:visible group-hover:opacity-100',
                      item.specials ? 'w-[940px]' : 'w-[560px]'
                    )}
                  >
                    <div className="flex gap-6 rounded-2xl border border-ink/10 bg-white p-6 shadow-xl">
                      <div className="grid flex-1 grid-cols-4 gap-6">
                        {item.columns.map((col) => (
                          <div key={col.title}>
                            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-ink/40">
                              {col.title}
                            </p>
                            <ul className="space-y-2">
                              {col.links.map((l) => (
                                <li key={l.label}>
                                  <Link
                                    href={l.href}
                                    className="text-sm text-ink/70 transition hover:text-nova-600"
                                  >
                                    {l.label}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>

                      {item.specials && (
                        <div className="w-56 shrink-0 border-l border-ink/10 pl-6">
                          <p className="mb-4 text-xs font-bold uppercase tracking-wide text-ink/40">
                            Specials
                          </p>
                          <div className="grid grid-cols-2 gap-x-3 gap-y-5">
                            {item.specials.map((s) => {
                              const Icon = s.icon;
                              return (
                                <Link
                                  key={s.label}
                                  href={s.href}
                                  className="group/sp flex flex-col items-center gap-2 text-center"
                                >
                                  <span className="grid h-14 w-14 place-items-center rounded-full bg-nova-50 text-nova-600 transition group-hover/sp:bg-nova-600 group-hover/sp:text-white">
                                    <Icon className="h-6 w-6" />
                                  </span>
                                  <span className="text-xs font-medium text-ink/70">{s.label}</span>
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button onClick={() => setSearchOpen(true)} aria-label="Search" className="icon-btn p-2">
              <Search className="h-5 w-5" />
            </button>

            <Link href="/account/wishlist" className="relative p-2" aria-label="Wishlist">
              <Heart className="h-5 w-5" />
              {ids.size > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
                  {ids.size}
                </span>
              )}
            </Link>

            <button onClick={() => setOpen(true)} className="relative p-2" aria-label="Cart">
              <ShoppingBag className="h-5 w-5" />
              {summary.itemCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-nova-600 text-[10px] font-bold text-white">
                  {summary.itemCount}
                </span>
              )}
            </button>

            <div
              className="relative hidden sm:block"
              onMouseEnter={() => setAccountOpen(true)}
              onMouseLeave={() => setAccountOpen(false)}
            >
              <button className="p-2" aria-label="Account">
                <User className="h-5 w-5" />
              </button>
              {accountOpen && (
                <div className="absolute right-0 top-full w-56 pt-2">
                  <div className="rounded-2xl border border-ink/10 bg-white p-2 shadow-xl">
                    {user ? (
                      <>
                        <div className="px-3 py-2">
                          <p className="text-sm font-semibold">{user.name}</p>
                          <p className="truncate text-xs text-ink/50">{user.email}</p>
                        </div>
                        <hr className="my-1 border-ink/10" />
                        <MenuLink href="/account">My Profile</MenuLink>
                        <MenuLink href="/account/orders">My Orders</MenuLink>
                        <MenuLink href="/account/wishlist">Wishlist</MenuLink>
                        <MenuLink href="/account/addresses">Addresses</MenuLink>
                        {user.role === 'admin' && (
                          <MenuLink href="http://localhost:3001">Admin Panel</MenuLink>
                        )}
                        <button
                          onClick={() => {
                            logout();
                            router.push('/');
                          }}
                          className="w-full rounded-lg px-3 py-2 text-left text-sm text-accent hover:bg-ink/5"
                        >
                          Logout
                        </button>
                      </>
                    ) : (
                      <>
                        <MenuLink href="/login">Login</MenuLink>
                        <MenuLink href="/register">Create Account</MenuLink>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-80 max-w-[85%] overflow-y-auto bg-white p-5">
            <div className="mb-6 flex items-center justify-between">
              <span className="text-xl font-black">
                Nova<span className="text-nova-600">Style</span>
              </span>
              <button onClick={() => setMobileOpen(false)} aria-label="Close menu">
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav className="space-y-1">
              {NAV.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-xl px-3 py-3 text-base font-semibold hover:bg-ink/5"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <hr className="my-4 border-ink/10" />
            <div className="space-y-1">
              {user ? (
                <>
                  <Link href="/account" onClick={() => setMobileOpen(false)} className="block rounded-xl px-3 py-3 font-medium hover:bg-ink/5">My Account</Link>
                  <button onClick={() => { logout(); setMobileOpen(false); }} className="block w-full rounded-xl px-3 py-3 text-left font-medium text-accent hover:bg-ink/5">Logout</button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMobileOpen(false)} className="block rounded-xl px-3 py-3 font-medium hover:bg-ink/5">Login</Link>
                  <Link href="/register" onClick={() => setMobileOpen(false)} className="block rounded-xl px-3 py-3 font-medium hover:bg-ink/5">Create Account</Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}

function MenuLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="block rounded-lg px-3 py-2 text-sm hover:bg-ink/5">
      {children}
    </Link>
  );
}
