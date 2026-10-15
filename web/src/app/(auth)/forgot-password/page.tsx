'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Lock, Mail, ArrowLeft, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { resetPassword } from '@/lib/authService';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleSendReset = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage('');

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage('Please enter your registered email address.');
      return;
    }

    setLoading(true);

    try {
      const origin = window.location.origin;
      const { error } = await resetPassword(cleanEmail, origin);

      if (error) {
        setErrorMessage(error);
      } else {
        setSuccess(true);
        setCooldown(60);
      }
    } catch {
      setErrorMessage('Failed to send reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div>
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Login</span>
        </Link>
      </div>

      {/* Header */}
      <div className="space-y-2 text-center lg:text-left">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto lg:mx-0 shadow-inner">
          <Lock className="w-6 h-6" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Forgot Password
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Enter your email to receive a secure password recovery link
        </p>
      </div>

      {/* Inline Error Alert */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      {/* Success Card */}
      {success ? (
        <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-4 animate-in fade-in duration-300">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-emerald-900">Reset link sent!</h3>
              <p className="text-xs text-emerald-700 leading-relaxed">
                We sent a password reset link to <strong className="font-semibold">{email}</strong>.
                The link is valid for 1 hour.
              </p>
              <p className="text-[11px] text-emerald-600 pt-1">
                Hint: If you don&apos;t see the email, please check your spam or promotions folder.
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between">
            <button
              type="button"
              onClick={() => handleSendReset()}
              disabled={loading || cooldown > 0}
              className="text-xs font-bold text-emerald-800 hover:text-emerald-950 disabled:opacity-50 transition"
            >
              {cooldown > 0 ? `Resend Email in ${cooldown}s` : 'Resend Email'}
            </button>
            <Link href="/login" className="text-xs font-bold text-blue-700 hover:text-blue-900">
              Return to Login
            </Link>
          </div>
        </div>
      ) : (
        /* Form */
        <form onSubmit={handleSendReset} className="space-y-4">
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

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 transition duration-150 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{loading ? 'Sending link...' : 'Send Reset Link'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
