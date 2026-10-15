'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Lock, Mail, Loader2, AlertCircle } from 'lucide-react';
import { signIn, signInWithGoogle } from '@/lib/authService';
import { useAuth } from '@/context/AuthContext';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '';
  const errorParam = searchParams.get('error') || '';

  const { refreshProfile } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (errorParam) {
      if (errorParam === 'suspended') {
        setErrorMessage('Account suspended. Contact support.');
      } else if (errorParam === 'email_not_confirmed') {
        setErrorMessage('Please verify your email before logging in.');
      } else {
        setErrorMessage(decodeURIComponent(errorParam));
      }
    }

    // Check remembered email
    const savedEmail = localStorage.getItem('drbd_remembered_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, [errorParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await signIn({ email: cleanEmail, password });

      if (error) {
        setErrorMessage(error);
        setLoading(false);
        return;
      }

      if (rememberMe) {
        localStorage.setItem('drbd_remembered_email', cleanEmail);
      } else {
        localStorage.removeItem('drbd_remembered_email');
      }

      await refreshProfile();

      const profile = data?.profile;

      // 1. Incomplete profile
      if (!profile || profile.profile_completed === false) {
        router.push('/complete-profile');
        return;
      }

      // 2. Route by role
      if (profile.role === 'admin') {
        router.push('/admin');
      } else if (profile.role === 'volunteer') {
        router.push('/use-mobile');
      } else {
        // citizen
        router.push(redirectUrl ? decodeURIComponent(redirectUrl) : '/citizen/dashboard');
      }
    } catch (err: unknown) {
      console.error('Login submit error:', err);
      setErrorMessage('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage('');
    setGoogleLoading(true);
    try {
      const origin = window.location.origin;
      const { error } = await signInWithGoogle(origin);
      if (error) {
        setErrorMessage(error);
        setGoogleLoading(false);
      }
    } catch {
      setErrorMessage('Google sign in failed. Please try again.');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1.5 text-center lg:text-left">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Welcome back
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Login to your CrisisLink Network account
        </p>
      </div>

      {/* Inline Error Alert */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      {/* Google Button */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={googleLoading || loading}
        className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm transition shadow-sm hover:shadow disabled:opacity-50"
      >
        {googleLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
        ) : (
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
        )}
        <span>Continue with Google</span>
      </button>

      {/* Divider */}
      <div className="relative flex items-center justify-center">
        <div className="border-t border-slate-200 w-full" />
        <span className="bg-white px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 absolute">
          or with email
        </span>
      </div>

      {/* Email / Password Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs font-bold text-blue-600 hover:text-blue-700"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="p-1.5 text-slate-400 hover:text-slate-600 absolute right-2.5 top-1/2 -translate-y-1/2"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Remember me */}
        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="remember"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="remember" className="text-xs font-medium text-slate-600 cursor-pointer">
            Remember me on this browser
          </label>
        </div>

        {/* Login Button with Spinner */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 transition duration-150 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{loading ? 'Signing in...' : 'Sign In'}</span>
          </button>
        </div>
      </form>

      {/* Switch to Sign Up */}
      <div className="text-center pt-2 border-t border-slate-100">
        <p className="text-xs text-slate-500">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-bold text-blue-600 hover:text-blue-700">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="h-64 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>}>
      <LoginFormContent />
    </Suspense>
  );
}
