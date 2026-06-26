'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [resetUrl, setResetUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const d = await api<{ resetUrl?: string }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setSent(true);
      if (d.resetUrl) setResetUrl(d.resetUrl);
    } catch {
      setSent(true); // do not leak which emails exist
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-nova grid min-h-[70vh] place-items-center py-12">
      <div className="w-full max-w-md rounded-3xl border border-ink/10 p-8 shadow-sm">
        <h1 className="text-2xl font-black">Reset your password</h1>
        {sent ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-ink/60">
              If an account exists for <strong>{email}</strong>, we&apos;ve sent password reset
              instructions.
            </p>
            {resetUrl && (
              <p className="break-all rounded-lg bg-nova-50 p-3 text-xs text-ink/60">
                Dev link:{' '}
                <Link href={resetUrl.replace(/^https?:\/\/[^/]+/, '')} className="text-nova-600 underline">
                  {resetUrl}
                </Link>
              </p>
            )}
            <Link href="/login" className="btn-primary w-full">
              Back to login
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <p className="text-sm text-ink/50">Enter your email and we&apos;ll send you a reset link.</p>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="you@example.com" />
            <button disabled={loading} className="btn-primary w-full">
              {loading ? 'Sending...' : 'Send reset link'}
            </button>
            <Link href="/login" className="block text-center text-sm text-nova-600">
              Back to login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
