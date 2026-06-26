'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';
import PageHeader from '@/components/PageHeader';

interface Page {
  _id?: string;
  title: string;
  slug: string;
  content?: string;
  isPublished?: boolean;
  updatedAt?: string;
}

export default function CmsPage() {
  const [pages, setPages] = useState<Page[]>([]);
  const [editing, setEditing] = useState<Page>({ title: '', slug: '', content: '', isPublished: true });
  const [saved, setSaved] = useState(false);

  const load = () => api<{ pages: Page[] }>('/cms').then((d) => setPages(d.pages)).catch(() => {});
  useEffect(() => {
    load();
  }, []);

  const openPage = async (slug: string) => {
    const d = await api<{ page: Page }>(`/cms/${slug}`);
    setEditing(d.page);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    await api('/cms', { method: 'POST', body: JSON.stringify(editing) });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    load();
  };

  return (
    <div>
      <PageHeader title="CMS Pages" />
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="card h-fit p-3">
          <button
            onClick={() => setEditing({ title: '', slug: '', content: '', isPublished: true })}
            className="btn-ghost mb-2 w-full"
          >
            + New Page
          </button>
          <div className="space-y-1">
            {pages.map((p) => (
              <button
                key={p.slug}
                onClick={() => openPage(p.slug)}
                className={`block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 ${editing.slug === p.slug ? 'bg-slate-100 font-semibold' : ''}`}
              >
                {p.title}
                <span className="block text-xs text-slate-400">
                  /{p.slug} · {p.updatedAt ? formatDate(p.updatedAt) : ''}
                </span>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={save} className="card space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Title</label>
              <input required value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className="input" />
            </div>
            <div>
              <label className="label">Slug</label>
              <input required value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} className="input" placeholder="about" />
            </div>
          </div>
          <div>
            <label className="label">Content (HTML)</label>
            <textarea value={editing.content} onChange={(e) => setEditing({ ...editing, content: e.target.value })} rows={12} className="input font-mono text-xs" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={editing.isPublished} onChange={(e) => setEditing({ ...editing, isPublished: e.target.checked })} />
            Published
          </label>
          <div className="flex items-center gap-3">
            <button className="btn-primary">Save Page</button>
            {saved && <span className="text-sm text-emerald-600">✓ Saved</span>}
          </div>
        </form>
      </div>
    </div>
  );
}
