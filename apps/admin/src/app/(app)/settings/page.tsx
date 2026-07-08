'use client';

import { useEffect, useState } from 'react';
import { Megaphone } from 'lucide-react';
import { api } from '@/lib/api';
import PageHeader from '@/components/PageHeader';

interface Settings {
  announcement: { enabled: boolean; text: string; link: string };
}

export default function StoreSettingsPage() {
  const [s, setS] = useState<Settings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api<{ settings: Settings }>('/settings/admin')
      .then((d) => setS(d.settings))
      .catch(() => {});
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!s) return;
    await api('/settings/admin', { method: 'PUT', body: JSON.stringify(s) });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  if (!s) return <p className="text-slate-400">Loading…</p>;
  const a = s.announcement;
  const set = (p: Partial<Settings['announcement']>) => setS({ ...s, announcement: { ...a, ...p } });

  return (
    <div>
      <PageHeader title="Store Settings" />

      <form onSubmit={save} className="card max-w-2xl space-y-5 p-6">
        <h2 className="flex items-center gap-2 font-bold">
          <Megaphone className="h-5 w-5 text-brand-600" /> Announcement Bar
        </h2>

        {/* Live preview */}
        <div className="rounded-lg bg-ink px-4 py-2 text-center text-xs font-medium text-white">
          {a.enabled ? `✨ ${a.text || '(uses the site’s default translated message)'}` : '(hidden)'}
        </div>

        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={a.enabled} onChange={(e) => set({ enabled: e.target.checked })} />
          Show the announcement bar on the storefront
        </label>

        <div>
          <label className="label">Message</label>
          <input
            value={a.text}
            onChange={(e) => set({ text: e.target.value })}
            maxLength={200}
            className="input"
            placeholder="Free shipping over ₹999 · Use code NOVA10 for 10% off"
          />
          <p className="mt-1 text-xs text-slate-400">
            Leave blank to use the built-in translated message (localized per language).
          </p>
        </div>

        <div>
          <label className="label">Link (optional)</label>
          <input value={a.link} onChange={(e) => set({ link: e.target.value })} className="input" placeholder="/collections/best-sellers" />
        </div>

        <div className="flex items-center gap-3">
          <button className="btn-primary">Save Settings</button>
          {saved && <span className="text-sm text-emerald-600">✓ Saved</span>}
        </div>
      </form>
    </div>
  );
}
