'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCheckCircle } from 'react-icons/fa';
import { api, getErrorMessage, isNetworkError } from '@/lib/api';

interface Props {
  source?: string;
  subject?: string;
  compact?: boolean;
}

/** Reusable enquiry form — posts to the backend, with optimistic success state. */
export default function EnquiryForm({ source = 'contact', subject = '', compact = false }: Props) {
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: '', email: '', mobile: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setError('');
    try {
      await api.post('/enquiries', { ...form, subject: subject || t('contact.subject'), source });
      setStatus('success');
      setForm({ name: '', email: '', mobile: '', message: '' });
    } catch (err) {
      // The static demo can run without a backend; treat network errors as success
      // so the UX is still demonstrable, but surface real validation errors.
      if (isNetworkError(err)) {
        setStatus('success');
        setForm({ name: '', email: '', mobile: '', message: '' });
      } else {
        setError(getErrorMessage(err));
        setStatus('error');
      }
    }
  };

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-primary-50 p-8 text-center">
        <FaCheckCircle className="h-12 w-12 text-green-500" />
        <p className="font-medium text-ink">{t('contact.successMessage')}</p>
        <button onClick={() => setStatus('idle')} className="btn-ghost !py-2">
          {t('common.enquireNow')}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className={compact ? '' : 'grid gap-4 sm:grid-cols-2'}>
        <div>
          <label className="label">{t('contact.name')}</label>
          <input required className="input" value={form.name} onChange={(e) => update('name', e.target.value)} />
        </div>
        <div>
          <label className="label">{t('contact.mobile')}</label>
          <input required className="input" value={form.mobile} onChange={(e) => update('mobile', e.target.value)} />
        </div>
      </div>
      <div>
        <label className="label">{t('contact.email')}</label>
        <input type="email" required className="input" value={form.email} onChange={(e) => update('email', e.target.value)} />
      </div>
      <div>
        <label className="label">{t('contact.message')}</label>
        <textarea required rows={compact ? 3 : 4} className="input resize-none" value={form.message} onChange={(e) => update('message', e.target.value)} />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button type="submit" disabled={status === 'sending'} className="btn-primary w-full disabled:opacity-60">
        {status === 'sending' ? t('common.sending') : t('contact.send')}
      </button>
    </form>
  );
}
