'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

function OtpFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const { refresh } = useAuth();
  const [email, setEmail] = useState(params.get('email') || '');
  const [otp, setOtp] = useState('');
  const [sent, setSent] = useState(false);
  const [devOtp, setDevOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const d = await api<{ otp?: string }>('/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setSent(true);
      if (d.otp) setDevOtp(d.otp); // dev convenience — omitted in production
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ email, otp }) });
      await refresh();
      router.push('/account');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid or expired OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-nova grid min-h-[70vh] place-items-center py-12">
      <div className="w-full max-w-md rounded-3xl border border-ink/10 p-8 shadow-sm">
        <Link href="/login" className="mb-4 inline-flex items-center gap-1 text-sm text-ink/60 hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Back to login
        </Link>
        <h1 className="text-2xl font-black">Login with OTP</h1>

        {!sent ? (
          <form onSubmit={sendOtp} className="mt-6 space-y-4">
            <p className="text-sm text-ink/50">Enter your email and we&apos;ll send you a one-time code.</p>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="you@example.com" />
            {error && <p className="rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">{error}</p>}
            <button disabled={loading} className="btn-primary w-full">
              {loading ? 'Sending…' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={verify} className="mt-6 space-y-4">
            <p className="text-sm text-ink/50">
              Enter the 6-digit code sent to <strong className="text-ink">{email}</strong>.
            </p>
            {devOtp && (
              <p className="rounded-lg bg-nova-50 p-3 text-center text-sm text-ink/60">
                Dev code: <strong className="tracking-widest text-nova-700">{devOtp}</strong>
              </p>
            )}
            <input
              inputMode="numeric"
              maxLength={6}
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              className="input text-center text-2xl tracking-[0.5em]"
              placeholder="••••••"
            />
            {error && <p className="rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">{error}</p>}
            <button disabled={loading} className="btn-primary w-full">
              {loading ? 'Verifying…' : 'Verify & Login'}
            </button>
            <button type="button" onClick={() => setSent(false)} className="block w-full text-center text-sm text-nova-600">
              Change email / resend
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={null}>
      <OtpFlow />
    </Suspense>
  );
}
