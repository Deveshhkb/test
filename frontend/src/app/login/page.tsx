'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { FaOm } from 'react-icons/fa';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary-50/40 px-4 py-28">
      <div className="card w-full max-w-md p-8">
        <div className="mb-6 text-center">
          <FaOm className="mx-auto h-10 w-10 text-primary" />
          <h1 className="mt-3 font-heading text-2xl font-bold">{t('auth.loginTitle')}</h1>
          <p className="text-sm text-gray-500">{t('auth.loginSubtitle')}</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">{t('auth.email')}</label>
            <input type="email" required className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="label">{t('auth.password')}</label>
            <input type="password" required className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex items-center justify-between text-sm">
            <Link href="#" className="text-primary hover:underline">{t('auth.forgotPassword')}</Link>
            <Link href="#" className="text-gray-500 hover:text-primary">{t('auth.otpLogin')}</Link>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
            {loading ? t('common.loading') : t('auth.signIn')}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-gray-500">
          {t('auth.noAccount')}{' '}
          <Link href="/register" className="font-semibold text-primary hover:underline">{t('auth.signUp')}</Link>
        </p>
      </div>
    </div>
  );
}
