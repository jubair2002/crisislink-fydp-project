'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { HelpCircle, Lock, Loader2, CheckCircle2, ArrowLeft, AlertCircle, RefreshCw } from 'lucide-react';
import { resetPassword, mapAuthError } from '@/lib/authService';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => {
        setCountdown((c) => c - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email.trim());
      setIsSubmitted(true);
      setCountdown(60);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to send reset link. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || loading) return;
    await handleSubmit();
  };

  return (
    <div className="w-full space-y-6">
      {/* Icon: Lock with question mark */}
      <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 relative mx-auto md:mx-0">
        <Lock className="w-6 h-6" />
        <HelpCircle className="w-3.5 h-3.5 text-blue-600 bg-white rounded-full absolute -top-1 -right-1" />
      </div>

      <div className="space-y-1 text-left">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Forgot your password?
        </h2>
        <p className="text-sm text-slate-500">
          Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>

      {isSubmitted ? (
        /* Success Card */
        <div className="p-6 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-4 animate-fade-in">
          <div className="flex items-center gap-3 text-emerald-800">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            <h3 className="font-bold text-base">Reset link sent!</h3>
          </div>
          <div className="text-xs sm:text-sm text-emerald-900/80 space-y-2 leading-relaxed">
            <p>
              Check your email inbox at <strong className="font-semibold">{email}</strong>. The link expires in 1 hour.
            </p>
            <p className="text-xs text-emerald-700">
              Didn&apos;t receive it? Check spam or resend.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleResend}
              disabled={countdown > 0 || loading}
              className="flex-1 py-2 px-3 rounded-lg border border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-800 text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
              )}
              <span>
                {countdown > 0 ? `Resend Email (${countdown}s)` : 'Resend Email'}
              </span>
            </button>
            <Link
              href="/login"
              className="py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 transition text-center shadow-sm"
            >
              Back to Login
            </Link>
          </div>
        </div>
      ) : (
        /* Reset Request Form */
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errorMessage) setErrorMessage('');
              }}
              placeholder="your@email.com"
              autoComplete="email"
              required
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
            />
          </div>

          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm shadow-md shadow-blue-500/10 transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Sending Reset Link…</span>
              </>
            ) : (
              'Send Reset Link'
            )}
          </button>
        </form>
      )}

      {/* Return to Login */}
      <div className="text-center pt-2">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Login</span>
        </Link>
      </div>
    </div>
  );
}
