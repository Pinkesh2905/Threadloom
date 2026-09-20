'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

interface RequireAuthProps {
  children: React.ReactNode;
  /** Also require staff. Server-side checks still gate the data itself. */
  staffOnly?: boolean;
  fallback?: React.ReactNode;
}

/**
 * The single auth gate for protected routes.
 *
 * The rule that matters: never redirect while the session is still unknown.
 * Auth is restored from localStorage in an effect, so on a cold load
 * (typing a URL, refreshing, following a shared link) there is a window
 * where `user` is null simply because we haven't looked yet. Redirecting in
 * that window is what sent people to /login with a perfectly valid session.
 */
export const RequireAuth: React.FC<RequireAuthProps> = ({ children, staffOnly = false, fallback }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isInitialized } = useAuthStore();

  const allowed = Boolean(user) && (!staffOnly || Boolean(user?.is_staff));

  useEffect(() => {
    if (!isInitialized) return; // session still unknown — decide nothing yet
    if (!user) {
      // Come back here after signing in, so bookmarks and shared links work.
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [isInitialized, user, router, pathname]);

  if (!isInitialized) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center" aria-busy="true">
        <Loader2 className="w-6 h-6 text-secondary animate-spin" />
        <span className="sr-only">Checking your session…</span>
      </div>
    );
  }

  if (!allowed) {
    if (user && staffOnly) {
      return (
        <>{fallback ?? (
          <div className="max-w-md mx-auto px-sp-3 py-sp-6 text-center space-y-sp-2">
            <p className="text-sm text-secondary">This page is for staff accounts only.</p>
          </div>
        )}</>
      );
    }
    // Unauthenticated: the effect above is redirecting; hold the route.
    return (
      <div className="min-h-[50vh] flex items-center justify-center" aria-busy="true">
        <Loader2 className="w-6 h-6 text-secondary animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
};
