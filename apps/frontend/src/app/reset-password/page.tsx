'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    setLoading(true);
    try {
      await api('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
      router.push('/account');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-nova grid min-h-[70vh] place-items-center py-12">
      <div className="w-full max-w-md rounded-3xl border border-ink/10 p-8 shadow-sm">
        <h1 className="text-2xl font-black">Set a new password</h1>
        {!token ? (
          <p className="mt-4 text-sm text-accent">Invalid or missing reset token.</p>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="input" placeholder="New password" />
            {error && <p className="rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">{error}</p>}
            <button disabled={loading} className="btn-primary w-full">
              {loading ? 'Updating...' : 'Update password'}
            </button>
          </form>
        )}
        <Link href="/login" className="mt-4 block text-center text-sm text-nova-600">
          Back to login
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
  );
}
