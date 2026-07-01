'use client';

import { useEffect, useState } from 'react';
import { Trash2, Pencil, Power } from 'lucide-react';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/format';
import PageHeader from '@/components/PageHeader';

interface Coupon {
  _id: string;
  code: string;
  description?: string;
  type: 'percent' | 'flat';
  value: number;
  minOrderValue: number;
  maxDiscount: number;
  usageLimit: number;
  usedCount: number;
  expiresAt?: string;
  isActive: boolean;
}

const EMPTY = {
  code: '',
  description: '',
  type: 'percent',
  value: 10,
  minOrderValue: 0,
  maxDiscount: 0,
  usageLimit: 0,
  expiresAt: '',
  isActive: true,
};

export default function CouponsPage() {
  const [items, setItems] = useState<Coupon[]>([]);
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const load = () => api<{ coupons: Coupon[] }>('/coupons').then((d) => setItems(d.coupons)).catch(() => {});
  useEffect(() => {
    load();
  }, []);

  const reset = () => {
    setForm(EMPTY);
    setEditingId(null);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMsg('');
    const payload = {
      ...form,
      code: form.code.toUpperCase().trim(),
      value: Number(form.value),
      minOrderValue: Number(form.minOrderValue),
      maxDiscount: Number(form.maxDiscount),
      usageLimit: Number(form.usageLimit),
      expiresAt: form.expiresAt || undefined,
    };
    try {
      if (editingId) {
        await api(`/coupons/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
        setMsg(`Coupon ${payload.code} updated.`);
      } else {
        await api('/coupons', { method: 'POST', body: JSON.stringify(payload) });
        setMsg(`Coupon ${payload.code} created.`);
      }
      reset();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.');
    }
  };

  const edit = (c: Coupon) => {
    setEditingId(c._id);
    setForm({
      code: c.code,
      description: c.description || '',
      type: c.type,
      value: c.value,
      minOrderValue: c.minOrderValue,
      maxDiscount: c.maxDiscount,
      usageLimit: c.usageLimit || 0,
      expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : '',
      isActive: c.isActive,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleActive = async (c: Coupon) => {
    await api(`/coupons/${c._id}`, { method: 'PUT', body: JSON.stringify({ isActive: !c.isActive }) });
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
      {msg && <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{msg}</p>}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="th">Code</th>
                <th className="th">Discount</th>
                <th className="th">Min Order</th>
                <th className="th">Used</th>
                <th className="th">Status</th>
                <th className="th text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr><td className="td text-slate-400" colSpan={6}>No coupons yet.</td></tr>
              )}
              {items.map((c) => (
                <tr key={c._id} className={editingId === c._id ? 'bg-brand-50' : 'border-b border-slate-50'}>
                  <td className="td">
                    <p className="font-bold">{c.code}</p>
                    {c.description && <p className="text-xs text-slate-400">{c.description}</p>}
                  </td>
                  <td className="td">{c.type === 'percent' ? `${c.value}%${c.maxDiscount ? ` (max ${formatPrice(c.maxDiscount)})` : ''}` : formatPrice(c.value)}</td>
                  <td className="td text-slate-500">{formatPrice(c.minOrderValue)}</td>
                  <td className="td text-slate-500">{c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ''}</td>
                  <td className="td">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${c.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                      {c.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="td">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => toggleActive(c)} className="rounded-lg p-2 hover:bg-slate-100" title={c.isActive ? 'Deactivate' : 'Activate'}>
                        <Power className={`h-4 w-4 ${c.isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                      </button>
                      <button onClick={() => edit(c)} className="rounded-lg p-2 hover:bg-slate-100" title="Edit"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => remove(c._id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50" title="Delete"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <form onSubmit={save} className="card h-fit space-y-4 p-5">
          <h2 className="font-bold">{editingId ? 'Edit Coupon' : 'Create Coupon'}</h2>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <div>
            <label className="label">Code</label>
            <input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="input" placeholder="NOVA10" />
          </div>
          <div>
            <label className="label">Description</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" placeholder="10% off over ₹999" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input">
                <option value="percent">Percent %</option>
                <option value="flat">Flat ₹</option>
              </select>
            </div>
            <div>
              <label className="label">Value</label>
              <input type="number" min={0} value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} className="input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Min Order ₹</label>
              <input type="number" min={0} value={form.minOrderValue} onChange={(e) => setForm({ ...form, minOrderValue: Number(e.target.value) })} className="input" />
            </div>
            <div>
              <label className="label">Max Discount ₹</label>
              <input type="number" min={0} value={form.maxDiscount} onChange={(e) => setForm({ ...form, maxDiscount: Number(e.target.value) })} className="input" placeholder="0 = no cap" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Usage Limit</label>
              <input type="number" min={0} value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: Number(e.target.value) })} className="input" placeholder="0 = unlimited" />
            </div>
            <div>
              <label className="label">Expires</label>
              <input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} className="input" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
            Active
          </label>
          <div className="flex gap-2">
            <button className="btn-primary flex-1">{editingId ? 'Update Coupon' : 'Create Coupon'}</button>
            {editingId && (
              <button type="button" onClick={reset} className="btn-ghost">Cancel</button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
