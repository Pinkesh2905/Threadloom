'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, User as UserIcon, Loader2, ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import { GoogleIcon } from '@/components/GoogleIcon';

interface AuthFormProps {
  mode: 'login' | 'register';
}

export const AuthForm: React.FC<AuthFormProps> = ({ mode }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuthStore();

  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'register' && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'register') {
        const res = await api.post('/auth/register/', {
          email,
          password,
          confirm_password: confirmPassword,
          display_name: displayName,
        });
        setAuth(res.data.user, res.data.tokens.access, res.data.tokens.refresh);
      } else {
        const res = await api.post('/auth/login/', { email, password });
        const access = res.data.access;
        const refresh = res.data.refresh;

        const profileRes = await api.get('/auth/profile/', {
          headers: { Authorization: `Bearer ${access}` },
        });

        setAuth(profileRes.data, access, refresh);
      }

      // Honour ?next= so bookmarks, refreshes and shared links land where
      // the person was actually trying to go.
      const next = searchParams.get('next');
      router.push(next && next.startsWith('/') ? next : '/studio');
    } catch (err: any) {
      if (err.response?.data) {
        const data = err.response.data;
        if (data.detail) {
          setError(data.detail);
        } else if (data.email) {
          setError(`Email: ${data.email[0]}`);
        } else if (data.password) {
          setError(`Password: ${data.password[0]}`);
        } else if (data.non_field_errors) {
          setError(data.non_field_errors[0]);
        } else {
          setError('Authentication failed. Please check your credentials.');
        }
      } else {
        setError('Network error. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-sp-4">
        <h1 className="text-2xl sm:text-3xl font-serif text-ink tracking-tight">
          {mode === 'login' ? 'Welcome back' : 'Create your account'}
        </h1>
        <p className="text-sm text-secondary mt-1.5 leading-relaxed">
          {mode === 'login'
            ? 'Sign in to pick up your designs and orders.'
            : 'Start designing garments from a blank canvas — your style, your rules.'}
        </p>
      </div>

      {/* Google — visual only for now, no auth behind it yet */}
      <button
        type="button"
        className="w-full py-3 rounded-full bg-white border border-hairline hover:bg-surface-subtle active:bg-surface-subtle active:scale-[0.98] text-ink font-semibold text-xs uppercase tracking-wider transition-colors duration-200 flex items-center justify-center gap-2"
      >
        <GoogleIcon className="w-4 h-4" />
        <span>Continue with Google</span>
      </button>

      <div className="flex items-center gap-3 my-sp-3">
        <div className="h-px flex-1 bg-hairline" />
        <span className="text-[11px] uppercase tracking-wider text-secondary/70 font-medium">or</span>
        <div className="h-px flex-1 bg-hairline" />
      </div>

      {error && (
        <div className="mb-sp-3 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs text-center font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-sp-3 text-xs">
        {/* Display name (Register mode) */}
        {mode === 'register' && (
          <div>
            <label className="block font-semibold text-secondary mb-1.5 uppercase tracking-wide text-[11px]">
              Name
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-secondary absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Jordan Rivera"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-surface-subtle border border-hairline text-xs text-ink placeholder:text-secondary/60 focus:bg-white focus:outline-none focus:border-ink transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
              />
            </div>
          </div>
        )}

        {/* Email */}
        <div>
          <label className="block font-semibold text-secondary mb-1.5 uppercase tracking-wide text-[11px]">
            Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-secondary absolute left-3 top-3" />
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-surface-subtle border border-hairline text-xs text-ink placeholder:text-secondary/60 focus:bg-white focus:outline-none focus:border-ink transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="block font-semibold text-secondary mb-1.5 uppercase tracking-wide text-[11px]">
            Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-secondary absolute left-3 top-3" />
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-surface-subtle border border-hairline text-xs text-ink placeholder:text-secondary/60 focus:bg-white focus:outline-none focus:border-ink transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
            />
          </div>
        </div>

        {/* Confirm Password (Register mode) */}
        {mode === 'register' && (
          <div>
            <label className="block font-semibold text-secondary mb-1.5 uppercase tracking-wide text-[11px]">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-secondary absolute left-3 top-3" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-surface-subtle border border-hairline text-xs text-ink placeholder:text-secondary/60 focus:bg-white focus:outline-none focus:border-ink transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
              />
            </div>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 mt-2 rounded-full bg-ink hover:bg-black active:bg-black active:scale-[0.98] text-white font-semibold text-xs uppercase tracking-wider transition-colors duration-200 flex items-center justify-center space-x-sp-1 group"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </>
          )}
        </button>
      </form>

      {/* Switch mode footer */}
      <div className="mt-sp-3 pt-sp-3 border-t border-hairline text-center text-xs text-secondary">
        {mode === 'login' ? (
          <p>
            Don&apos;t have a Threadloom account?{' '}
            <Link href="/register" className="text-ink font-semibold hover:underline active:underline">
              Create one now
            </Link>
          </p>
        ) : (
          <p>
            Already have an account?{' '}
            <Link href="/login" className="text-ink font-semibold hover:underline active:underline">
              Sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
};
