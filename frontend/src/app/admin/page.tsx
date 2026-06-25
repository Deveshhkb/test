'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { FaUsers, FaSuitcase, FaRupeeSign, FaEnvelopeOpenText, FaBoxOpen, FaMapMarkedAlt, FaHotel, FaBlog, FaImages, FaPrayingHands } from 'react-icons/fa';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { formatINR } from '@/lib/localize';
import AdminResourceManager from '@/components/views/admin/AdminResourceManager';
import { RESOURCE_CONFIGS, MODULE_TO_RESOURCE } from '@/components/views/admin/resourceConfigs';

interface Stats {
  totalUsers: number;
  totalBookings: number;
  newEnquiries: number;
  totalPackages: number;
  revenue: number;
}

const MODULES = [
  { key: 'managePackages', Icon: FaBoxOpen },
  { key: 'manageDestinations', Icon: FaMapMarkedAlt },
  { key: 'manageTemples', Icon: FaPrayingHands },
  { key: 'manageHotels', Icon: FaHotel },
  { key: 'manageBlogs', Icon: FaBlog },
  { key: 'manageGallery', Icon: FaImages },
  { key: 'manageEnquiries', Icon: FaEnvelopeOpenText },
  { key: 'manageUsers', Icon: FaUsers },
] as const;

export default function AdminPage() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');
  const [activeResource, setActiveResource] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) router.push('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === 'admin') {
      api.get('/admin/stats').then((r) => setStats(r.data.data)).catch(() => setError('Connect the backend to load live stats.'));
    }
  }, [user]);

  if (loading || !user || user.role !== 'admin') {
    return <div className="flex min-h-screen items-center justify-center pt-20 text-gray-400">{t('common.loading')}</div>;
  }

  const cards = [
    { label: t('admin.totalUsers'), value: stats?.totalUsers ?? '—', Icon: FaUsers, color: 'bg-blue-500' },
    { label: t('admin.totalBookings'), value: stats?.totalBookings ?? '—', Icon: FaSuitcase, color: 'bg-primary' },
    { label: t('admin.revenue'), value: stats ? formatINR(stats.revenue) : '—', Icon: FaRupeeSign, color: 'bg-green-500' },
    { label: t('admin.newEnquiries'), value: stats?.newEnquiries ?? '—', Icon: FaEnvelopeOpenText, color: 'bg-secondary-600' },
  ];

  // A module is open → show its CRUD manager instead of the dashboard.
  if (activeResource && RESOURCE_CONFIGS[activeResource]) {
    return (
      <div className="bg-gray-50 pt-16">
        <div className="container-px py-12">
          <AdminResourceManager config={RESOURCE_CONFIGS[activeResource]} onBack={() => setActiveResource(null)} />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 pt-16">
      <div className="container-px py-12">
        <h1 className="mb-2 font-heading text-2xl font-bold">{t('admin.title')}</h1>
        {error && <p className="mb-4 rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-700">{error}</p>}

        {/* Summary cards */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => (
            <div key={c.label} className="card flex items-center gap-4 p-5">
              <span className={`flex h-12 w-12 items-center justify-center rounded-xl text-white ${c.color}`}>
                <c.Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs text-gray-400">{c.label}</p>
                <p className="font-heading text-xl font-bold text-ink">{c.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Management modules */}
        <h2 className="mb-4 mt-12 font-heading text-lg font-semibold">Modules</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {MODULES.map(({ key, Icon }) => (
            <button
              key={key}
              onClick={() => setActiveResource(MODULE_TO_RESOURCE[key])}
              className="card group flex flex-col items-start gap-3 p-6 text-left transition hover:border-primary"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary transition group-hover:bg-primary group-hover:text-white">
                <Icon className="h-5 w-5" />
              </span>
              <span className="font-medium text-ink">{t(`admin.${key}`)}</span>
              <span className="text-xs text-gray-400">Create, edit & delete →</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
