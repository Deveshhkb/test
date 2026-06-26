'use client';

import { useEffect, useState } from 'react';
import { Trash2, Pencil } from 'lucide-react';
import { api } from '@/lib/api';
import PageHeader from '@/components/PageHeader';

interface Category {
  _id: string;
  name: string;
  slug: string;
  isFeatured: boolean;
  image?: string;
}

export default function CategoriesPage() {
  const [items, setItems] = useState<Category[]>([]);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: '', image: '', isFeatured: false });

  const load = () => api<{ categories: Category[] }>('/catalog/categories').then((d) => setItems(d.categories)).catch(() => {});
  useEffect(() => {
    load();
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      await api(`/catalog/categories/${editing._id}`, { method: 'PUT', body: JSON.stringify(form) });
    } else {
      await api('/catalog/categories', { method: 'POST', body: JSON.stringify(form) });
    }
    setForm({ name: '', image: '', isFeatured: false });
    setEditing(null);
    load();
  };

  const edit = (c: Category) => {
    setEditing(c);
    setForm({ name: c.name, image: c.image || '', isFeatured: c.isFeatured });
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this category?')) return;
    await api(`/catalog/categories/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div>
      <PageHeader title="Categories" />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="th">Name</th>
                <th className="th">Slug</th>
                <th className="th">Featured</th>
                <th className="th text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c._id} className="border-b border-slate-50">
                  <td className="td font-medium">{c.name}</td>
                  <td className="td text-slate-500">{c.slug}</td>
                  <td className="td">{c.isFeatured ? '✓' : '—'}</td>
                  <td className="td">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => edit(c)} className="rounded-lg p-2 hover:bg-slate-100"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => remove(c._id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <form onSubmit={save} className="card h-fit space-y-4 p-5">
          <h2 className="font-bold">{editing ? 'Edit' : 'Add'} Category</h2>
          <div>
            <label className="label">Name</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
          </div>
          <div>
            <label className="label">Image URL</label>
            <input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} className="input" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} />
            Featured on homepage
          </label>
          <div className="flex gap-2">
            <button className="btn-primary flex-1">{editing ? 'Update' : 'Add'}</button>
            {editing && (
              <button type="button" onClick={() => { setEditing(null); setForm({ name: '', image: '', isFeatured: false }); }} className="btn-ghost">
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
