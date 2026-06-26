'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import PageHeader from '@/components/PageHeader';

interface Banner {
  _id: string;
  title: string;
  subtitle?: string;
  image: string;
  placement: string;
  link?: string;
  isActive: boolean;
}

export default function BannersPage() {
  const [items, setItems] = useState<Banner[]>([]);
  const [form, setForm] = useState({ title: '', subtitle: '', image: '', placement: 'hero', link: '/', ctaText: 'Shop Now' });

  const load = () => api<{ banners: Banner[] }>('/banners').then((d) => setItems(d.banners)).catch(() => {});
  useEffect(() => {
    load();
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    await api('/banners', { method: 'POST', body: JSON.stringify(form) });
    setForm({ title: '', subtitle: '', image: '', placement: 'hero', link: '/', ctaText: 'Shop Now' });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete banner?')) return;
    await api(`/banners/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div>
      <PageHeader title="Banners" />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((b) => (
            <div key={b._id} className="card overflow-hidden">
              <div className="relative aspect-[16/9] bg-slate-100">
                {b.image && <Image src={b.image} alt={b.title} fill className="object-cover" sizes="400px" />}
                <button onClick={() => remove(b._id)} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-red-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="p-3">
                <p className="font-semibold">{b.title}</p>
                <p className="text-xs text-slate-400">{b.subtitle}</p>
                <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs capitalize">{b.placement}</span>
              </div>
            </div>
          ))}
          {items.length === 0 && <p className="text-sm text-slate-400">No banners yet.</p>}
        </div>

        <form onSubmit={save} className="card h-fit space-y-4 p-5">
          <h2 className="font-bold">Add Banner</h2>
          <div>
            <label className="label">Title</label>
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input" />
          </div>
          <div>
            <label className="label">Subtitle</label>
            <input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} className="input" />
          </div>
          <div>
            <label className="label">Image URL</label>
            <input required value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} className="input" placeholder="https://…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Placement</label>
              <select value={form.placement} onChange={(e) => setForm({ ...form, placement: e.target.value })} className="input">
                {['hero', 'promo', 'category', 'offer'].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Link</label>
              <input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} className="input" />
            </div>
          </div>
          <button className="btn-primary w-full">Add Banner</button>
        </form>
      </div>
    </div>
  );
}
