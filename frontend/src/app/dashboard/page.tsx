'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { FaSuitcase, FaHeart, FaBookmark, FaUserCog, FaSignOutAlt } from 'react-icons/fa';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { packages } from '@/data/content';
import { localize, formatINR } from '@/lib/localize';

interface Booking {
  _id: string;
  type: string;
  status: string;
  amount: number;
  package?: { title: { en: string }; coverImage: string };
  createdAt: string;
}

const TABS = [
  { key: 'myBookings', Icon: FaSuitcase },
  { key: 'savedPackages', Icon: FaBookmark },
  { key: 'wishlist', Icon: FaHeart },
  { key: 'profile', Icon: FaUserCog },
] as const;

export default function DashboardPage() {
  const { t, i18n } = useTranslation();
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('myBookings');
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (user) api.get('/bookings/mine').then((r) => setBookings(r.data.data)).catch(() => setBookings([]));
  }, [user]);

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center pt-20 text-gray-400">{t('common.loading')}</div>;
  }

  return (
    <div className="bg-primary-50/30 pt-16">
      <div className="container-px py-12">
        <div className="grid gap-8 lg:grid-cols-4">
          {/* Sidebar */}
          <aside className="card h-fit p-6">
            <div className="mb-6 flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-white">
                {user.name.charAt(0)}
              </span>
              <div>
                <p className="font-semibold text-ink">{user.name}</p>
                <p className="text-xs text-gray-400">{user.email}</p>
              </div>
            </div>
            <nav className="space-y-1">
              {TABS.map(({ key, Icon }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                    tab === key ? 'bg-primary text-white' : 'text-gray-600 hover:bg-primary-50'
                  }`}
                >
                  <Icon className="h-4 w-4" /> {t(`dashboard.${key}`)}
                </button>
              ))}
              <button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50">
                <FaSignOutAlt className="h-4 w-4" /> {t('nav.logout')}
              </button>
            </nav>
          </aside>

          {/* Content */}
          <section className="lg:col-span-3">
            <h1 className="mb-6 font-heading text-2xl font-bold">{t('dashboard.title')}</h1>

            {tab === 'myBookings' && (
              <div className="space-y-4">
                {bookings.length === 0 ? (
                  <div className="card p-10 text-center text-gray-400">{t('dashboard.noBookings')}</div>
                ) : (
                  bookings.map((b) => (
                    <div key={b._id} className="card flex items-center justify-between p-5">
                      <div>
                        <p className="font-medium text-ink">{b.package?.title.en || b.type}</p>
                        <p className="text-xs text-gray-400">{new Date(b.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <span className="chip capitalize">{b.status}</span>
                        <p className="mt-1 text-sm font-semibold text-primary">{formatINR(b.amount)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {(tab === 'savedPackages' || tab === 'wishlist') && (
              <div className="grid gap-6 sm:grid-cols-2">
                {packages.slice(0, 2).map((p) => (
                  <Link key={p.slug} href={`/packages/${p.slug}`} className="card p-5 hover:border-primary">
                    <p className="font-semibold text-ink">{localize(p.title, i18n.language)}</p>
                    <p className="mt-1 text-sm text-primary">{formatINR(p.discountPrice ?? p.price)}</p>
                  </Link>
                ))}
              </div>
            )}

            {tab === 'profile' && (
              <div className="card max-w-lg space-y-4 p-7">
                {[
                  { label: t('auth.name'), value: user.name },
                  { label: t('auth.email'), value: user.email },
                  { label: t('auth.mobile'), value: user.mobile },
                ].map((f) => (
                  <div key={f.label}>
                    <label className="label">{f.label}</label>
                    <input className="input" defaultValue={f.value} />
                  </div>
                ))}
                <button className="btn-primary">{t('common.submit')}</button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
