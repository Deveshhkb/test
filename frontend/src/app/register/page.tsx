'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { FaOm } from 'react-icons/fa';
import { useAuth } from '@/lib/auth';

export default function RegisterPage() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', mobile: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { key: 'name', label: t('auth.name'), type: 'text' },
    { key: 'email', label: t('auth.email'), type: 'email' },
    { key: 'mobile', label: t('auth.mobile'), type: 'tel' },
    { key: 'password', label: t('auth.password'), type: 'password' },
  ] as const;

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary-50/40 px-4 py-28">
      <div className="card w-full max-w-md p-8">
        <div className="mb-6 text-center">
          <FaOm className="mx-auto h-10 w-10 text-primary" />
          <h1 className="mt-3 font-heading text-2xl font-bold">{t('auth.registerTitle')}</h1>
          <p className="text-sm text-gray-500">{t('auth.registerSubtitle')}</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="label">{f.label}</label>
              <input
                type={f.type}
                required
                minLength={f.key === 'password' ? 6 : undefined}
                className="input"
                value={form[f.key]}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              />
            </div>
          ))}
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
            {loading ? t('common.loading') : t('auth.signUp')}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-gray-500">
          {t('auth.haveAccount')}{' '}
          <Link href="/login" className="font-semibold text-primary hover:underline">{t('auth.signIn')}</Link>
        </p>
      </div>
    </div>
  );
}
