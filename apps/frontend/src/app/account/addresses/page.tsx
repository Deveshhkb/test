'use client';

import { useEffect, useState } from 'react';
import { Trash2, MapPin, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { validateAddress, hasErrors, type AddressErrors } from '@/lib/validateAddress';
import { cn } from '@/lib/utils';
import type { Address } from '@/lib/types';

const EMPTY = { fullName: '', phone: '', line1: '', line2: '', city: '', state: '', pincode: '', country: 'India' };

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<AddressErrors>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () =>
    api<{ addresses: Address[] }>('/addresses')
      .then((d) => setAddresses(d.addresses))
      .catch(() => {});

  useEffect(() => {
    load();
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const errors = validateAddress(form);
    setFieldErrors(errors);
    if (hasErrors(errors)) return;

    setSaving(true);
    try {
      await api('/addresses', { method: 'POST', body: JSON.stringify({ ...form, isDefault: addresses.length === 0 }) });
      setForm(EMPTY);
      setFieldErrors({});
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the address.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    await api(`/addresses/${id}`, { method: 'DELETE' });
    load();
  };

  const setDefault = async (id: string) => {
    await api(`/addresses/${id}`, { method: 'PUT', body: JSON.stringify({ isDefault: true }) });
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">Saved Addresses</h1>
        <button onClick={() => setShowForm((s) => !s)} className="btn-outline !py-2 text-sm">
          <Plus className="h-4 w-4" /> Add New
        </button>
      </div>

      {showForm && (
        <form noValidate onSubmit={save} className="mt-5 grid gap-3 rounded-2xl border border-ink/10 p-5 sm:grid-cols-2">
          <Field label="Full Name" v={form.fullName} on={(v) => setForm({ ...form, fullName: v })} err={fieldErrors.fullName} />
          <Field label="Phone" v={form.phone} on={(v) => setForm({ ...form, phone: v })} err={fieldErrors.phone} inputMode="tel" />
          <Field label="Address Line 1" v={form.line1} on={(v) => setForm({ ...form, line1: v })} err={fieldErrors.line1} full />
          <Field label="Address Line 2" v={form.line2} on={(v) => setForm({ ...form, line2: v })} full />
          <Field label="City" v={form.city} on={(v) => setForm({ ...form, city: v })} err={fieldErrors.city} />
          <Field label="State" v={form.state} on={(v) => setForm({ ...form, state: v })} err={fieldErrors.state} />
          <Field label="Pincode" v={form.pincode} on={(v) => setForm({ ...form, pincode: v })} err={fieldErrors.pincode} inputMode="numeric" />
          {error && <p className="sm:col-span-2 text-sm text-accent">{error}</p>}
          <div className="sm:col-span-2">
            <button disabled={saving} className="btn-primary !py-2.5">
              {saving ? 'Saving…' : 'Save Address'}
            </button>
          </div>
        </form>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {addresses.map((a) => (
          <div key={a._id} className="relative rounded-2xl border border-ink/10 p-5">
            {a.isDefault && (
              <span className="absolute right-4 top-4 rounded-full bg-nova-100 px-2 py-0.5 text-xs font-semibold text-nova-700">
                Default
              </span>
            )}
            <MapPin className="h-5 w-5 text-nova-600" />
            <p className="mt-2 font-semibold">{a.fullName}</p>
            <p className="text-sm text-ink/60">{a.phone}</p>
            <p className="mt-1 text-sm text-ink/60">
              {a.line1}, {a.line2 && `${a.line2}, `}
              {a.city}, {a.state} - {a.pincode}
            </p>
            <div className="mt-3 flex gap-3 text-sm">
              {!a.isDefault && (
                <button onClick={() => setDefault(a._id)} className="font-medium text-nova-600">
                  Set as default
                </button>
              )}
              <button onClick={() => remove(a._id)} className="flex items-center gap-1 font-medium text-accent">
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </button>
            </div>
          </div>
        ))}
        {addresses.length === 0 && !showForm && (
          <p className="text-sm text-ink/50">No saved addresses yet.</p>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  v,
  on,
  full,
  err,
  inputMode,
}: {
  label: string;
  v: string;
  on: (v: string) => void;
  full?: boolean;
  err?: string;
  inputMode?: 'tel' | 'numeric' | 'text';
}) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label className="mb-1 block text-xs font-medium text-ink/60">{label}</label>
      <input
        value={v}
        onChange={(e) => on(e.target.value)}
        inputMode={inputMode}
        aria-invalid={Boolean(err)}
        className={cn('input !py-2.5', err && 'border-accent focus:border-accent')}
      />
      {err && <p className="mt-1 text-xs text-accent">{err}</p>}
    </div>
  );
}
