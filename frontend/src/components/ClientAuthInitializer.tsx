'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

export default function ClientAuthInitializer() {
  useEffect(() => {
    useAuthStore.getState().initialize();
  }, []);

  return null;
}
