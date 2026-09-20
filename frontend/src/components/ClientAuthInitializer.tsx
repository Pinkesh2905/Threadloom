'use client';

import { useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

/**
 * Restores the session on boot, then re-verifies it against the server.
 *
 * The localStorage copy of the user is a cache, not a source of truth —
 * `is_staff` in particular can be stale (granted or revoked since the last
 * login), and a client-side role check reading a stale flag is not a
 * security boundary. Every admin endpoint enforces the role server-side
 * too; this just keeps the UI honest about what it offers.
 */
export default function ClientAuthInitializer() {
  useEffect(() => {
    useAuthStore.getState().initialize();

    if (!useAuthStore.getState().accessToken) return;

    api
      .get('/auth/profile/')
      .then((res) => useAuthStore.getState().updateUser(res.data))
      .catch(() => {
        // A 401 here has already cleared the session via the api
        // interceptor. Anything else (offline, backend cold-starting) is not
        // a reason to sign someone out — leave the cached session in place.
      });
  }, []);

  return null;
}
