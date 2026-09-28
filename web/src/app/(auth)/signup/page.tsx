'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, User, HeartHandshake } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { signInWithGoogle, mapAuthError } from '@/lib/authService';
import type { UserRole } from '@/types/auth';

export default function SignUpPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'citizen' | 'volunteer'>('citizen');
  const [termsAgreed, setTermsAgreed] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Password strength calculation
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

  const validate = () => {
    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMessage('Please enter a valid email address.');
      return false;
    }
    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return false;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return false;
    }
    if (!role) {
      setErrorMessage('Please select whether you are a Citizen or a Volunteer.');
      return false;
    }
    if (!termsAgreed) {
      setErrorMessage('Please agree to the Terms of Service and Privacy Policy.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!validate()) return;

    setLoading(true);
    const supabase = createClient();

    try {
      // 1. Supabase auth signUp
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            name: fullName.trim(),
            full_name: fullName.trim(),
            role: role as UserRole,
          },
        },
      });

      if (error) {
        setErrorMessage(mapAuthError(error.message));
        setLoading(false);
        return;
      }

      if (!data.user) {
        setErrorMessage('Unable to register account. Please try again.');
        setLoading(false);
        return;
      }

      const userId = data.user.id;

      // 2. Insert into profiles table
      const { error: profileError } = await supabase.from('profiles').upsert(
        {
          user_id: userId,
          name: fullName.trim(),
          email: email.trim(),
          role: role as UserRole,
          profile_completed: false,
        },
        { onConflict: 'user_id' },
      );

      if (profileError) {
        console.warn('Profile creation warning:', profileError.message);
      }

      // 3. If volunteer: insert into volunteers & volunteer_settings
      if (role === 'volunteer') {
        const { error: volErr } = await supabase.from('volunteers').upsert(
          {
            user_id: userId,
            verification_status: 'pending',
          },
          { onConflict: 'user_id' },
        );
        if (volErr) console.warn('Volunteers table warning:', volErr.message);

        const { error: volSetErr } = await supabase.from('volunteer_settings').upsert(
          {
            user_id: userId,
          },
          { onConflict: 'user_id' },
        );
        if (volSetErr) console.warn('Volunteer settings warning:', volSetErr.message);
      }

      // 4. Insert into user_settings
      const { error: userSetErr } = await supabase.from('user_settings').upsert(
        {
          user_id: userId,
        },
        { onConflict: 'user_id' },
      );
      if (userSetErr) console.warn('User settings warning:', userSetErr.message);

      // 5. Redirect to complete profile
      router.push('/complete-profile');
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'An unexpected error occurred during signup.',
      );
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage('');
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Google sign-in failed. Please try again.',
      );
      setGoogleLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="space-y-1 text-left">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Create your account
        </h2>
        <p className="text-sm text-slate-500">
          Join Bangladesh&apos;s unified emergency and disaster relief network
        </p>
      </div>

      {/* Google OAuth Button */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={googleLoading || loading}
        className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium text-sm hover:bg-slate-50 active:bg-slate-100 transition shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {googleLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
        ) : (
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
        <span className="bg-white px-3 text-xs uppercase tracking-wider text-slate-400 font-medium">
          or
        </span>
        <div className="border-t border-slate-200 w-full" />
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name */}
        <div>
          <label
            htmlFor="fullName"
            className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
          >
            Full Name
          </label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              if (errorMessage) setErrorMessage('');
            }}
            placeholder="John Doe"
            required
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
          />
        </div>

        {/* Email */}
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

        {/* Password */}
        <div>
          <label
            htmlFor="password"
            className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errorMessage) setErrorMessage('');
              }}
              placeholder="Minimum 8 characters"
              autoComplete="new-password"
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

        {/* Confirm Password */}
        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
          >
            Confirm Password
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errorMessage) setErrorMessage('');
              }}
              placeholder="Re-enter your password"
              autoComplete="new-password"
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

        {/* Role Selection Cards */}
        <div className="space-y-2 pt-1">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Choose your role
          </label>
          <div className="grid grid-cols-2 gap-3">
            {/* Citizen card */}
            <div
              onClick={() => setRole('citizen')}
              className={`cursor-pointer rounded-xl p-3.5 border-2 transition-all flex flex-col justify-between select-none relative ${
                role === 'citizen'
                  ? 'border-blue-600 bg-blue-50/70 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              {role === 'citizen' && (
                <CheckCircle2 className="w-4 h-4 text-blue-600 absolute top-3 right-3" />
              )}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">👤</span>
                <span className="font-bold text-sm text-slate-900">I&apos;m a Citizen</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Report disasters, request help, donate to causes
              </p>
            </div>

            {/* Volunteer card */}
            <div
              onClick={() => setRole('volunteer')}
              className={`cursor-pointer rounded-xl p-3.5 border-2 transition-all flex flex-col justify-between select-none relative ${
                role === 'volunteer'
                  ? 'border-blue-600 bg-blue-50/70 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              {role === 'volunteer' && (
                <CheckCircle2 className="w-4 h-4 text-blue-600 absolute top-3 right-3" />
              )}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🙋</span>
                <span className="font-bold text-sm text-slate-900">I&apos;m a Volunteer</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Respond to crises, complete rescue tasks, coordinate
              </p>
            </div>
          </div>
        </div>

        {/* Terms of Service Checkbox */}
        <div className="pt-2">
          <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-600 select-none">
            <input
              type="checkbox"
              checked={termsAgreed}
              onChange={(e) => setTermsAgreed(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <span>
              I agree to the{' '}
              <span className="text-blue-600 font-medium hover:underline">Terms of Service</span>{' '}
              and{' '}
              <span className="text-blue-600 font-medium hover:underline">Privacy Policy</span>.
            </span>
          </label>
        </div>

        {/* Inline Error Message */}
        {errorMessage && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm animate-shake">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || googleLoading}
          className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm shadow-md shadow-blue-500/10 transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Creating Account…</span>
            </>
          ) : (
            'Create Account'
          )}
        </button>
      </form>

      {/* Bottom Link */}
      <div className="text-center text-xs sm:text-sm text-slate-500 pt-2 border-t border-slate-100">
        Already have an account?{' '}
        <Link
          href="/login"
          className="font-semibold text-blue-600 hover:text-blue-700 hover:underline transition"
        >
          Login
        </Link>
      </div>
    </div>
  );
}
