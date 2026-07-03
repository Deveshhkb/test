'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { User, Package, Heart, MapPin, LogOut, Bell, CreditCard } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '/account', label: 'Profile', icon: User },
  { href: '/account/orders', label: 'My Orders', icon: Package },
  { href: '/account/wishlist', label: 'Wishlist', icon: Heart },
  { href: '/account/addresses', label: 'Addresses', icon: MapPin },
  { href: '/account/cards', label: 'Saved Cards', icon: CreditCard },
  { href: '/account/notifications', label: 'Notifications', icon: Bell },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push('/login?redirect=/account');
  }, [loading, user, router]);

  if (loading || !user) return null;

  return (
    <div className="container-nova py-8">
      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="h-fit rounded-2xl border border-ink/10 p-4 lg:sticky lg:top-24">
          <div className="mb-4 flex items-center gap-3 px-2 py-3">
            <div className="grid h-11 w-11 place-items-center rounded-full bg-nova-100 font-bold text-nova-700">
              {user.name?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold">{user.name}</p>
              <p className="truncate text-xs text-ink/50">{user.email}</p>
            </div>
          </div>
          <nav className="space-y-1">
            {LINKS.map((l) => {
              const active = pathname === l.href;
              const Icon = l.icon;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                    active ? 'bg-ink text-white' : 'hover:bg-ink/5'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {l.label}
                </Link>
              );
            })}
            <button
              onClick={() => {
                logout();
                router.push('/');
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-accent transition hover:bg-accent/5"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </nav>
        </aside>

        <div>{children}</div>
      </div>
    </div>
  );
}
