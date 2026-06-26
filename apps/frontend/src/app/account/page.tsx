'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function ProfilePage() {
  const { user, refresh } = useAuth();
  const [form, setForm] = useState({ name: '', phone: '' });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) setForm({ name: user.name || '', phone: (user as any).phone || '' });
  }, [user]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api('/auth/me', { method: 'PUT', body: JSON.stringify(form) });
      await refresh();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-black">My Profile</h1>
      <p className="mt-1 text-sm text-ink/50">Manage your personal information.</p>

      <form onSubmit={save} className="mt-6 max-w-lg space-y-4 rounded-2xl border border-ink/10 p-6">
        <div>
          <label className="mb-1 block text-sm font-medium">Full Name</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Email</label>
          <input value={user?.email || ''} disabled className="input bg-ink/5" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Phone</label>
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" placeholder="+91" />
        </div>
        <div className="flex items-center gap-3">
          <button disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          {saved && <span className="text-sm text-green-600">✓ Saved</span>}
        </div>
      </form>
    </div>
  );
}
