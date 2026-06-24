'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import { FaUsers, FaCheckCircle } from 'react-icons/fa';
import { cabs } from '@/data/content';
import { formatINR } from '@/lib/localize';
import PageHeader from '@/components/shared/PageHeader';
import Reveal from '@/components/shared/Reveal';
import { api, getErrorMessage } from '@/lib/api';

const TRIP_TYPES = ['oneWay', 'roundTrip', 'airport', 'railway'] as const;

export default function CabsView() {
  const { t } = useTranslation();
  const [trip, setTrip] = useState<(typeof TRIP_TYPES)[number]>('oneWay');
  const [form, setForm] = useState({ pickup: '', drop: '', name: '', mobile: '', vehicle: cabs[0].name });
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/enquiries', {
        name: form.name,
        mobile: form.mobile,
        email: 'cab@request.local',
        subject: `Cab: ${form.vehicle} (${t(`cabs.${trip}`)})`,
        message: `Pickup: ${form.pickup} → Drop: ${form.drop}`,
        source: 'cab',
      });
      setDone(true);
    } catch (err) {
      if (getErrorMessage(err).toLowerCase().includes('network')) setDone(true);
    }
  };

  return (
    <>
      <PageHeader title={t('cabs.title')} subtitle={t('cabs.subtitle')} />
      <section className="section">
        <div className="container-px">
          {/* Booking widget */}
          <Reveal className="card mx-auto -mt-24 max-w-4xl p-6 shadow-glow">
            <div className="mb-5 flex flex-wrap gap-2">
              {TRIP_TYPES.map((tt) => (
                <button key={tt} onClick={() => setTrip(tt)} className={`rounded-full px-4 py-2 text-sm font-medium transition ${trip === tt ? 'bg-primary text-white' : 'border border-gray-200 text-gray-600'}`}>
                  {t(`cabs.${tt}`)}
                </button>
              ))}
            </div>
            {done ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <FaCheckCircle className="h-10 w-10 text-green-500" />
                <p className="font-medium">{t('contact.successMessage')}</p>
              </div>
            ) : (
              <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <input required className="input" placeholder={t('cabs.pickup')} value={form.pickup} onChange={(e) => setForm({ ...form, pickup: e.target.value })} />
                <input required className="input" placeholder={t('cabs.drop')} value={form.drop} onChange={(e) => setForm({ ...form, drop: e.target.value })} />
                <input required className="input" placeholder={t('contact.name')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <input required className="input" placeholder={t('contact.mobile')} value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
                <select className="input" value={form.vehicle} onChange={(e) => setForm({ ...form, vehicle: e.target.value })}>
                  {cabs.map((c) => <option key={c.name}>{c.name}</option>)}
                </select>
                <button className="btn-primary lg:col-span-3">{t('common.bookNow')}</button>
              </form>
            )}
          </Reveal>

          {/* Vehicle types */}
          <h2 className="section-title mt-16 text-center text-2xl">{t('cabs.vehicleType')}</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {cabs.map((c, i) => (
              <Reveal key={c.name} delay={i * 0.08}>
                <article className="card group flex flex-col">
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <Image src={c.image} alt={c.name} fill sizes="33vw" className="object-cover transition-transform duration-700 group-hover:scale-110" />
                    <span className="absolute left-3 top-3 chip bg-white/90">{c.vehicleType}</span>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="font-heading text-lg font-semibold text-ink">{c.name}</h3>
                    <div className="mt-1 flex items-center gap-1.5 text-sm text-gray-500"><FaUsers className="h-3.5 w-3.5 text-primary" /> {c.seats} {t('cabs.seats')}</div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {c.features.map((f) => <span key={f} className="chip">{f}</span>)}
                    </div>
                    <div className="mt-auto pt-4">
                      <span className="text-xl font-bold text-primary">{formatINR(c.pricePerKm)}</span>
                      <span className="text-sm text-gray-400">{t('cabs.perKm')}</span>
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
