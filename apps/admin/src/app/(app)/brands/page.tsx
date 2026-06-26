'use client';

import { useEffect, useState } from 'react';
import { Trash2, Pencil } from 'lucide-react';
import { api } from '@/lib/api';
import PageHeader from '@/components/PageHeader';

interface Brand {
  _id: string;
  name: string;
  slug: string;
  description?: string;
}

export default function BrandsPage() {
  const [items, setItems] = useState<Brand[]>([]);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });

  const load = () => api<{ brands: Brand[] }>('/catalog/brands').then((d) => setItems(d.brands)).catch(() => {});
  useEffect(() => {
    load();
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) await api(`/catalog/brands/${editing._id}`, { method: 'PUT', body: JSON.stringify(form) });
    else await api('/catalog/brands', { method: 'POST', body: JSON.stringify(form) });
    setForm({ name: '', description: '' });
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this brand?')) return;
    await api(`/catalog/brands/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div>
      <PageHeader title="Brands" />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="th">Name</th>
                <th className="th">Slug</th>
                <th className="th text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((b) => (
                <tr key={b._id} className="border-b border-slate-50">
                  <td className="td font-medium">{b.name}</td>
                  <td className="td text-slate-500">{b.slug}</td>
                  <td className="td">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => { setEditing(b); setForm({ name: b.name, description: b.description || '' }); }} className="rounded-lg p-2 hover:bg-slate-100"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => remove(b._id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <form onSubmit={save} className="card h-fit space-y-4 p-5">
          <h2 className="font-bold">{editing ? 'Edit' : 'Add'} Brand</h2>
          <div>
            <label className="label">Name</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="input" />
          </div>
          <div className="flex gap-2">
            <button className="btn-primary flex-1">{editing ? 'Update' : 'Add'}</button>
            {editing && (
              <button type="button" onClick={() => { setEditing(null); setForm({ name: '', description: '' }); }} className="btn-ghost">
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
