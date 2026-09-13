'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { AuthForm } from '@/components/AuthForm';
import { AuthShell } from '@/components/AuthShell';

export default function RegisterPage() {
  const router = useRouter();
  const { user, isInitialized } = useAuthStore();

  useEffect(() => {
    if (isInitialized && user) {
      router.replace('/studio');
    }
  }, [isInitialized, user, router]);

  if (!isInitialized || user) {
    return null;
  }

  return (
    <AuthShell>
      <AuthForm mode="register" />
    </AuthShell>
  );
}
