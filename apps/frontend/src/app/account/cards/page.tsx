'use client';

import { useEffect, useState } from 'react';
import { CreditCard, Trash2, Plus, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';

interface Card {
  _id: string;
  cardholderName: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

const EMPTY = { cardholderName: '', number: '', brand: 'visa', expMonth: '', expYear: '' };

export default function CardsPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  const load = () => api<{ cards: Card[] }>('/cards').then((d) => setCards(d.cards)).catch(() => {});
  useEffect(() => {
    load();
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api('/cards', { method: 'POST', body: JSON.stringify({ ...form, isDefault: cards.length === 0 }) });
      setForm(EMPTY);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save card.');
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Remove this card?')) return;
    await api(`/cards/${id}`, { method: 'DELETE' });
    load();
  };
  const setDefault = async (id: string) => {
    await api(`/cards/${id}/default`, { method: 'PUT' });
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">Saved Cards</h1>
        <button onClick={() => setShowForm((s) => !s)} className="btn-outline !py-2 text-sm">
          <Plus className="h-4 w-4" /> Add Card
        </button>
      </div>

      <p className="mt-2 flex items-center gap-1.5 text-xs text-ink/50">
        <ShieldCheck className="h-4 w-4 text-green-600" />
        For your security we store only the last 4 digits — never the full number or CVV. Payments are processed securely by Razorpay.
      </p>

      {showForm && (
        <form onSubmit={save} className="mt-5 grid gap-3 rounded-2xl border border-ink/10 p-5 sm:grid-cols-2">
          {error && <p className="sm:col-span-2 rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">{error}</p>}
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-ink/60">Cardholder Name</label>
            <input required value={form.cardholderName} onChange={(e) => setForm({ ...form, cardholderName: e.target.value })} className="input !py-2.5" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-ink/60">Card Number</label>
            <input required inputMode="numeric" maxLength={19} value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} className="input !py-2.5" placeholder="1234 5678 9012 3456" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Brand</label>
            <select value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="input !py-2.5">
              {['visa', 'mastercard', 'rupay', 'amex'].map((b) => (
                <option key={b} value={b}>{b.toUpperCase()}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Exp. Month</label>
              <input required inputMode="numeric" value={form.expMonth} onChange={(e) => setForm({ ...form, expMonth: e.target.value })} className="input !py-2.5" placeholder="MM" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Exp. Year</label>
              <input required inputMode="numeric" value={form.expYear} onChange={(e) => setForm({ ...form, expYear: e.target.value })} className="input !py-2.5" placeholder="YYYY" />
            </div>
          </div>
          <div className="sm:col-span-2">
            <button className="btn-primary !py-2.5">Save Card</button>
          </div>
        </form>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <div key={c._id} className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-ink to-nova-800 p-5 text-white">
            {c.isDefault && (
              <span className="absolute right-4 top-4 rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold">Default</span>
            )}
            <CreditCard className="h-7 w-7 text-white/70" />
            <p className="mt-6 font-mono text-lg tracking-widest">•••• •••• •••• {c.last4}</p>
            <div className="mt-3 flex items-center justify-between text-sm">
              <div>
                <p className="text-[10px] uppercase text-white/50">Cardholder</p>
                <p className="font-medium">{c.cardholderName}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase text-white/50">Expires</p>
                <p className="font-medium">{String(c.expMonth).padStart(2, '0')}/{String(c.expYear).slice(-2)}</p>
              </div>
              <p className="text-xs font-bold uppercase text-white/80">{c.brand}</p>
            </div>
            <div className="mt-4 flex gap-3 text-xs">
              {!c.isDefault && (
                <button onClick={() => setDefault(c._id)} className="font-medium text-nova-200">Set as default</button>
              )}
              <button onClick={() => remove(c._id)} className="flex items-center gap-1 font-medium text-red-300">
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </button>
            </div>
          </div>
        ))}
        {cards.length === 0 && !showForm && <p className="text-sm text-ink/50">No saved cards yet.</p>}
      </div>
    </div>
  );
}
