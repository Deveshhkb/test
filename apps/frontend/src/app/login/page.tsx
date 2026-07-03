'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get('redirect') || '/account';
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.push(redirect);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-nova grid min-h-[70vh] place-items-center py-12">
      <div className="w-full max-w-md rounded-3xl border border-ink/10 p-8 shadow-sm">
        <h1 className="text-2xl font-black">Welcome back</h1>
        <p className="mt-1 text-sm text-ink/50">Log in to continue shopping.</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="you@example.com" />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-sm font-medium">Password</label>
              <Link href="/forgot-password" className="text-xs text-nova-600">Forgot password?</Link>
            </div>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="input" placeholder="••••••••" />
          </div>
          {error && <p className="rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">{error}</p>}
          <button disabled={loading} className="btn-primary w-full">
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-ink/40">
          <span className="h-px flex-1 bg-ink/10" /> OR <span className="h-px flex-1 bg-ink/10" />
        </div>
        <div className="space-y-2">
          <Link href="/verify-otp" className="btn-outline w-full">
            Login with OTP
          </Link>
          <button className="btn-outline w-full" type="button" title="Social login requires OAuth provider setup">
            Continue with Google
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-ink/60">
          New to NovaStyle?{' '}
          <Link href="/register" className="font-semibold text-nova-600">
            Create an account
          </Link>
        </p>
        <p className="mt-3 rounded-lg bg-nova-50 p-3 text-center text-xs text-ink/50">
          Demo: customer@novastyle.test / customer123
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
