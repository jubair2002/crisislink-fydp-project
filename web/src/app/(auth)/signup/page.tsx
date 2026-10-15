'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import { signUp, signInWithGoogle } from '@/lib/authService';
import { useAuth } from '@/context/AuthContext';

export default function SignUpPage() {
  const router = useRouter();
  const { refreshProfile } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Password strength calculation
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

    const cleanName = name.trim();
    const cleanEmail = email.trim();

    if (!cleanName || !cleanEmail || !password || !confirmPassword) {
      setErrorMessage('Please fill in all required fields.');
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

    if (!agreeTerms) {
      setErrorMessage('Please agree to the Terms of Service and Privacy Policy.');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await signUp({
        name: cleanName,
        email: cleanEmail,
        password,
      });

      if (error) {
        setErrorMessage(error);
        setLoading(false);
        return;
      }

      await refreshProfile();
      router.push('/complete-profile');
    } catch (err: unknown) {
      console.error('Sign up error:', err);
      setErrorMessage('An unexpected error occurred during account creation.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
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
      setErrorMessage('Google signup failed. Please try again.');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1.5 text-center lg:text-left">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Create an Account
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Join CrisisLink Network as a citizen and community responder
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
        onClick={handleGoogleSignUp}
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
        <span>Sign up with Google</span>
      </button>

      {/* Divider */}
      <div className="relative flex items-center justify-center">
        <div className="border-t border-slate-200 w-full" />
        <span className="bg-white px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 absolute">
          or sign up with email
        </span>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Full Name
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Tanvir Ahmed"
              required
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
            />
          </div>
        </div>

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
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Password (min 8 characters)
          </label>
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

          {/* Password Strength Indicator */}
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
            Confirm Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
            />
          </div>
        </div>

        {/* Terms Checkbox */}
        <div className="flex items-start gap-2 pt-1">
          <input
            type="checkbox"
            id="terms"
            checked={agreeTerms}
            onChange={(e) => setAgreeTerms(e.target.checked)}
            required
            className="w-4 h-4 mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="terms" className="text-xs text-slate-600 leading-relaxed cursor-pointer">
            I agree to the{' '}
            <Link href="/" className="font-bold text-blue-600 hover:text-blue-700">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/" className="font-bold text-blue-600 hover:text-blue-700">
              Privacy Policy
            </Link>
          </label>
        </div>

        {/* Submit */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 transition duration-150 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{loading ? 'Creating Account...' : 'Create Account'}</span>
          </button>
        </div>
      </form>

      {/* Switch to Login */}
      <div className="text-center pt-2 border-t border-slate-100">
        <p className="text-xs text-slate-500">
          Already have an account?{' '}
          <Link href="/login" className="font-bold text-blue-600 hover:text-blue-700">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
