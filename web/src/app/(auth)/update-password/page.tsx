'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { updatePassword } from '@/lib/authService';
import { showToast } from '@/components/Toast';

export default function UpdatePasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [success, setSuccess] = useState(false);

  // Strength score
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: 'bg-slate-200', text: '' };
    if (pass.length < 8) return { score: 1, label: 'Weak', color: 'bg-rose-500', text: 'text-rose-600' };

    let strength = 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) strength++;
    if (/[0-9]/.test(pass)) strength++;
    if (/[^A-Za-z0-9]/.test(pass)) strength++;

    if (strength <= 2) return { score: 2, label: 'Fair', color: 'bg-amber-500', text: 'text-amber-600' };
    return { score: 3, label: 'Strong', color: 'bg-emerald-500', text: 'text-emerald-600' };
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!password || !confirmPassword) {
      setErrorMessage('Please enter and confirm your new password.');
      return;
    }

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
      const { error } = await updatePassword(password);

      if (error) {
        setErrorMessage(error);
        setLoading(false);
        return;
      }

      setSuccess(true);
      showToast.success('Password updated successfully!', 'Redirecting to login...');

      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch {
      setErrorMessage('Failed to update password. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2 text-center lg:text-left">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto lg:mx-0 shadow-inner">
          <Lock className="w-6 h-6" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Update Password
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Set a new secure password for your account
        </p>
      </div>

      {/* Inline Error Alert */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      {/* Success Banner */}
      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-3 animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>Password changed successfully. Redirecting you to sign in...</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* New Password */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            New Password (min 8 characters)
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={success}
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

          {/* Strength Bar */}
          {password && (
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Password strength:</span>
                <span className={`font-bold ${strength.text}`}>{strength.label}</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    strength.score >= 1 ? strength.color : 'bg-slate-200'
                  }`}
                />
                <div
                  className={`h-full transition-all ${
                    strength.score >= 2 ? strength.color : 'bg-slate-200'
                  }`}
                />
                <div
                  className={`h-full transition-all ${
                    strength.score >= 3 ? strength.color : 'bg-slate-200'
                  }`}
                />
              </div>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Confirm New Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={success}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading || success}
            className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 transition duration-150 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{loading ? 'Updating Password...' : 'Save New Password'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
