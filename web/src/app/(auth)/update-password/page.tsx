'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { updatePassword, mapAuthError } from '@/lib/authService';

export default function UpdatePasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [success, setSuccess] = useState(false);

  // Strength calculation
  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: 'bg-slate-200', textClass: 'text-slate-400' };

    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;

    if (password.length < 8) {
      return { score: 1, label: 'Weak (min 8 chars required)', color: 'bg-red-500', textClass: 'text-red-500' };
    }
    if (score <= 2) {
      return { score: 2, label: 'Fair', color: 'bg-amber-500', textClass: 'text-amber-500' };
    }
    return { score: 3, label: 'Strong', color: 'bg-emerald-500', textClass: 'text-emerald-500' };
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await updatePassword(password);
      setSuccess(true);
      toast.success('Password updated successfully! Redirecting to login…');
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to update password. Please try again.',
      );
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mx-auto md:mx-0">
        <KeyRound className="w-6 h-6" />
      </div>

      <div className="space-y-1 text-left">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Set new password
        </h2>
        <p className="text-sm text-slate-500">
          Enter a new secure password for your CrisisLink account.
        </p>
      </div>

      {success ? (
        <div className="p-6 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-3 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
          <h3 className="font-bold text-slate-900 text-lg">Password Changed!</h3>
          <p className="text-sm text-slate-600">
            Your password has been updated. You will be redirected to the login page shortly…
          </p>
          <div className="pt-2">
            <Link
              href="/login"
              className="text-sm font-semibold text-blue-600 hover:underline"
            >
              Click here if not redirected automatically
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* New password input */}
          <div>
            <label
              htmlFor="newPassword"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
            >
              New Password
            </label>
            <div className="relative">
              <input
                id="newPassword"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                placeholder="Minimum 8 characters"
                required
                className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Password strength bar */}
            {password.length > 0 && (
              <div className="mt-2 space-y-1.5">
                <div className="flex gap-1.5 h-1.5 w-full">
                  <div
                    className={`h-full rounded-full flex-1 transition-all ${
                      passwordStrength.score >= 1 ? passwordStrength.color : 'bg-slate-200'
                    }`}
                  />
                  <div
                    className={`h-full rounded-full flex-1 transition-all ${
                      passwordStrength.score >= 2 ? passwordStrength.color : 'bg-slate-200'
                    }`}
                  />
                  <div
                    className={`h-full rounded-full flex-1 transition-all ${
                      passwordStrength.score >= 3 ? passwordStrength.color : 'bg-slate-200'
                    }`}
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Strength:</span>
                  <span className={`font-medium ${passwordStrength.textClass}`}>
                    {passwordStrength.label}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div>
            <label
              htmlFor="confirmNewPassword"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
            >
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="confirmNewPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                placeholder="Re-enter your new password"
                required
                className={`w-full px-3.5 py-2.5 pr-10 rounded-lg border text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition ${
                  confirmPassword && confirmPassword !== password
                    ? 'border-red-400 focus:border-red-500'
                    : 'border-slate-300 focus:border-blue-600'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {confirmPassword && confirmPassword !== password && (
              <p className="text-xs text-red-500 mt-1">Passwords do not match.</p>
            )}
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
                <span>Updating Password…</span>
              </>
            ) : (
              'Update Password'
            )}
          </button>
        </form>
      )}
    </div>
  );
}
