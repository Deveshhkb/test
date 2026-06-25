/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useCallback, useEffect, useState } from 'react';
import { FaPlus, FaEdit, FaTrash, FaTimes, FaArrowLeft } from 'react-icons/fa';
import { api, getErrorMessage } from '@/lib/api';
import type { AdminField, ResourceConfig } from './resourceConfigs';

const getByPath = (obj: any, path: string) =>
  path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);

// Build an empty form value for a field.
const emptyValue = (f: AdminField): any => {
  switch (f.type) {
    case 'localized':
    case 'localizedArea':
      return { en: '', hi: '' };
    case 'array':
      return [];
    case 'boolean':
      return false;
    case 'number':
      return '';
    case 'json':
      return '';
    case 'select':
      return f.options?.[0] ?? '';
    default:
      return '';
  }
};

// Map an existing item onto the form shape.
const itemToForm = (item: any, fields: AdminField[]) => {
  const form: Record<string, any> = {};
  fields.forEach((f) => {
    const v = item?.[f.name];
    if (f.type === 'localized' || f.type === 'localizedArea') {
      form[f.name] = { en: v?.en ?? '', hi: v?.hi ?? '', _orig: v }; // keep other langs
    } else if (f.type === 'json') {
      form[f.name] = v != null ? JSON.stringify(v, null, 2) : '';
    } else if (f.type === 'array') {
      form[f.name] = Array.isArray(v) ? v : [];
    } else if (f.type === 'boolean') {
      form[f.name] = Boolean(v);
    } else {
      form[f.name] = v ?? '';
    }
  });
  return form;
};

// Turn the form back into an API payload.
const formToPayload = (form: Record<string, any>, fields: AdminField[]) => {
  const payload: Record<string, any> = {};
  fields.forEach((f) => {
    const v = form[f.name];
    switch (f.type) {
      case 'number':
        payload[f.name] = v === '' || v == null ? undefined : Number(v);
        break;
      case 'localized':
      case 'localizedArea':
        // Preserve any other-language values that were loaded with the item.
        payload[f.name] = { ...(v?._orig || {}), en: v?.en || '', hi: v?.hi || '' };
        break;
      case 'array':
        payload[f.name] = Array.isArray(v) ? v : String(v || '').split(',').map((s) => s.trim()).filter(Boolean);
        break;
      case 'boolean':
        payload[f.name] = Boolean(v);
        break;
      case 'json':
        payload[f.name] = v ? JSON.parse(v) : undefined; // may throw -> caught on save
        break;
      default:
        payload[f.name] = v;
    }
  });
  return payload;
};

export default function AdminResourceManager({
  config,
  onBack,
}: {
  config: ResourceConfig;
  onBack: () => void;
}) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [editing, setEditing] = useState<'new' | any | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setListError('');
    try {
      const { data } = await api.get(`${config.endpoint}?limit=100`);
      setItems(data.data || []);
    } catch (err) {
      setListError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [config.endpoint]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    const f: Record<string, any> = {};
    config.fields.forEach((field) => (f[field.name] = emptyValue(field)));
    setForm(f);
    setFormError('');
    setEditing('new');
  };

  const openEdit = (item: any) => {
    setForm(itemToForm(item, config.fields));
    setFormError('');
    setEditing(item);
  };

  const save = async () => {
    setSaving(true);
    setFormError('');
    try {
      const payload = formToPayload(form, config.fields);
      if (editing === 'new') {
        await api.post(config.endpoint, payload);
      } else {
        await api.put(`${config.endpoint}/${editing._id}`, payload);
      }
      setEditing(null);
      await load();
    } catch (err) {
      if (err instanceof SyntaxError) setFormError('Invalid JSON in one of the JSON fields.');
      else setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item: any) => {
    if (!confirm('Delete this item? This cannot be undone.')) return;
    try {
      await api.delete(`${config.endpoint}/${item._id}`);
      await load();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const update = (name: string, value: any) => setForm((f) => ({ ...f, [name]: value }));

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-primary">
          <FaArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
        </button>
        {!config.noCreate && (
          <button onClick={openCreate} className="btn-primary !px-4 !py-2">
            <FaPlus className="h-3.5 w-3.5" /> Add new
          </button>
        )}
      </div>

      <h2 className="mb-4 font-heading text-xl font-bold">Manage {config.label}</h2>

      {/* List */}
      {loading ? (
        <p className="py-10 text-center text-gray-400">Loading…</p>
      ) : listError ? (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{listError}</p>
      ) : items.length === 0 ? (
        <p className="py-10 text-center text-gray-400">No {config.label.toLowerCase()} yet.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
          {items.map((item, i) => (
            <div
              key={item._id || i}
              className={`flex items-center justify-between gap-4 px-5 py-3.5 ${i ? 'border-t border-gray-100' : ''}`}
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">{getByPath(item, config.primary) || '—'}</p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                  {config.secondary && <span className="chip capitalize">{String(getByPath(item, config.secondary) ?? '')}</span>}
                  {config.detail && <span className="truncate">{String(getByPath(item, config.detail) ?? '')}</span>}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <button onClick={() => openEdit(item)} className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:border-primary hover:text-primary" aria-label="Edit">
                  <FaEdit className="h-4 w-4" />
                </button>
                <button onClick={() => remove(item)} className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:border-red-400 hover:text-red-500" aria-label="Delete">
                  <FaTrash className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor modal */}
      {editing !== null && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-8 w-full max-w-2xl rounded-2xl bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h3 className="font-heading text-lg font-semibold">
                {editing === 'new' ? `Add ${config.label}` : `Edit ${config.label}`}
              </h3>
              <button onClick={() => setEditing(null)} aria-label="Close"><FaTimes className="h-5 w-5 text-gray-400" /></button>
            </div>

            <div className="max-h-[70vh] space-y-4 overflow-y-auto px-6 py-5">
              {config.fields.map((field) => (
                <FieldInput key={field.name} field={field} value={form[field.name]} onChange={(v) => update(field.name, v)} />
              ))}
              {formError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>}
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button onClick={() => setEditing(null)} className="btn-ghost !py-2">Cancel</button>
              <button onClick={save} disabled={saving} className="btn-primary !py-2 disabled:opacity-60">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FieldInput({ field, value, onChange }: { field: AdminField; value: any; onChange: (v: any) => void }) {
  const label = <label className="label">{field.label}</label>;

  switch (field.type) {
    case 'boolean':
      return (
        <label className="flex cursor-pointer items-center gap-2">
          <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[#FF7A00]" />
          <span className="text-sm font-medium text-gray-700">{field.label}</span>
        </label>
      );
    case 'select':
      return (
        <div>
          {label}
          <select className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
            {field.options?.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      );
    case 'number':
      return (
        <div>
          {label}
          <input type="number" className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
        </div>
      );
    case 'textarea':
      return (
        <div>
          {label}
          <textarea rows={3} className="input resize-none" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
        </div>
      );
    case 'json':
      return (
        <div>
          {label}
          <textarea rows={5} className="input resize-none font-mono text-xs" value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder="[ ... ] valid JSON" />
        </div>
      );
    case 'array':
      return (
        <div>
          {label}
          <input
            className="input"
            value={Array.isArray(value) ? value.join(', ') : value ?? ''}
            onChange={(e) => onChange(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
          />
        </div>
      );
    case 'image':
      return (
        <div>
          {label}
          <input className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder="https://..." />
          {value ? (
            // Plain img (not next/image) so any host works in the admin preview.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="preview" className="mt-2 h-24 w-full rounded-lg object-cover" />
          ) : null}
        </div>
      );
    case 'localized':
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            {label}
            <input className="input" value={value?.en ?? ''} onChange={(e) => onChange({ ...value, en: e.target.value })} placeholder="English" />
          </div>
          <div>
            <label className="label">हिन्दी (Hindi)</label>
            <input className="input" value={value?.hi ?? ''} onChange={(e) => onChange({ ...value, hi: e.target.value })} placeholder="Hindi" />
          </div>
        </div>
      );
    case 'localizedArea':
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            {label}
            <textarea rows={3} className="input resize-none" value={value?.en ?? ''} onChange={(e) => onChange({ ...value, en: e.target.value })} placeholder="English" />
          </div>
          <div>
            <label className="label">हिन्दी (Hindi)</label>
            <textarea rows={3} className="input resize-none" value={value?.hi ?? ''} onChange={(e) => onChange({ ...value, hi: e.target.value })} placeholder="Hindi" />
          </div>
        </div>
      );
    default:
      return (
        <div>
          {label}
          <input className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
        </div>
      );
  }
}
