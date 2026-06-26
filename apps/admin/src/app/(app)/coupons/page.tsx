'use client';

import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/format';
import PageHeader from '@/components/PageHeader';

interface Coupon {
  _id: string;
  code: string;
  type: 'percent' | 'flat';
  value: number;
  minOrderValue: number;
  maxDiscount: number;
  usedCount: number;
  isActive: boolean;
}

export default function CouponsPage() {
  const [items, setItems] = useState<Coupon[]>([]);
  const [form, setForm] = useState({ code: '', type: 'percent', value: 10, minOrderValue: 0, maxDiscount: 0, description: '' });

  const load = () => api<{ coupons: Coupon[] }>('/coupons').then((d) => setItems(d.coupons)).catch(() => {});
  useEffect(() => {
    load();
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    await api('/coupons', { method: 'POST', body: JSON.stringify({ ...form, code: form.code.toUpperCase() }) });
    setForm({ code: '', type: 'percent', value: 10, minOrderValue: 0, maxDiscount: 0, description: '' });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete coupon?')) return;
    await api(`/coupons/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div>
      <PageHeader title="Coupons" />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="th">Code</th>
                <th className="th">Discount</th>
                <th className="th">Min Order</th>
                <th className="th">Used</th>
                <th className="th text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c._id} className="border-b border-slate-50">
                  <td className="td font-bold">{c.code}</td>
                  <td className="td">{c.type === 'percent' ? `${c.value}%` : formatPrice(c.value)}</td>
                  <td className="td text-slate-500">{formatPrice(c.minOrderValue)}</td>
                  <td className="td text-slate-500">{c.usedCount}</td>
                  <td className="td">
                    <div className="flex justify-end">
                      <button onClick={() => remove(c._id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <form onSubmit={save} className="card h-fit space-y-4 p-5">
          <h2 className="font-bold">Create Coupon</h2>
          <div>
            <label className="label">Code</label>
            <input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="input" placeholder="NOVA10" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input">
                <option value="percent">Percent</option>
                <option value="flat">Flat ₹</option>
              </select>
            </div>
            <div>
              <label className="label">Value</label>
              <input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} className="input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Min Order ₹</label>
              <input type="number" value={form.minOrderValue} onChange={(e) => setForm({ ...form, minOrderValue: Number(e.target.value) })} className="input" />
            </div>
            <div>
              <label className="label">Max Discount ₹</label>
              <input type="number" value={form.maxDiscount} onChange={(e) => setForm({ ...form, maxDiscount: Number(e.target.value) })} className="input" />
            </div>
          </div>
          <button className="btn-primary w-full">Create</button>
        </form>
      </div>
    </div>
  );
}
