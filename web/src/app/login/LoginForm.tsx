'use client';

import { useActionState, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { loginAction, type LoginActionState } from './actions';

const initialState: LoginActionState = {};

export default function LoginForm() {
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  useEffect(() => {
    if (searchParams.get('error') === 'forbidden') {
      toast.error('That account does not have admin access.');
    }
  }, [searchParams]);

  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state.error]);

  return (
    <div className="w-full max-w-md">
      <div className="lg:hidden flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-lg bg-brand grid place-items-center text-white font-bold">
          C
        </div>
        <span className="text-lg font-semibold tracking-tight">CrisisLink</span>
      </div>

      <div className="inline-flex items-center gap-2 text-xs font-medium text-brand bg-brand/10 px-3 py-1.5 rounded-full mb-4">
        <ShieldCheck className="w-3.5 h-3.5" />
        Admin Access Only
      </div>

      <h2 className="text-3xl font-bold tracking-tight">Sign in to your dashboard</h2>
      <p className="text-sm text-ink-muted mt-2">
        Use your admin credentials to manage the disaster management platform.
      </p>

      <form action={formAction} className="mt-8 space-y-5">
        <label className="block">
          <span className="block text-sm font-medium text-ink mb-1.5">Email</span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="w-full h-11 rounded-lg border border-surface-border bg-surface px-3.5 text-sm shadow-card focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"
            placeholder="admin@crisislink.app"
          />
        </label>

        <label className="block">
          <span className="block text-sm font-medium text-ink mb-1.5">Password</span>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              required
              autoComplete="current-password"
              className="w-full h-11 rounded-lg border border-surface-border bg-surface px-3.5 pr-11 text-sm shadow-card focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-ink-muted hover:text-ink hover:bg-surface-muted transition"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </label>

        <button
          type="submit"
          disabled={pending}
          className="w-full h-11 rounded-lg bg-brand text-white font-medium text-sm shadow-card hover:bg-brand/90 active:bg-brand/80 disabled:opacity-60 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
        >
          {pending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Signing in…
            </>
          ) : (
            'Sign in'
          )}
        </button>
      </form>
    </div>
  );
}
