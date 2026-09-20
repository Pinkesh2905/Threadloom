'use client';

import React, { Suspense, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Navbar } from '@/components/Navbar';
import { StorefrontHeader } from '@/components/StorefrontHeader';
import { DesignErrorBoundary } from '@/components/DesignErrorBoundary';
import { DesignStudio } from '@/components/designer/DesignStudio';

function DesignStudioInner() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const { user, isInitialized } = useAuthStore();

  // Designing is open to everyone — an account is only required to save or
  // order, which the studio prompts for at that point. Making people sign
  // up before they've seen a product loses them for no reason.
  useEffect(() => {
    if (isInitialized && !user && searchParams.get('d')) {
      // Resuming a saved design does need the owner signed in.
      router.replace('/login');
    }
  }, [isInitialized, user, router, searchParams]);

  if (!isInitialized) {
    return null;
  }

  const designIdParam = searchParams.get('d');
  const initialDesignId = designIdParam ? Number(designIdParam) : undefined;

  return (
    <div className="min-h-screen bg-bg font-sans">
      {user ? <Navbar /> : <StorefrontHeader />}
      <DesignErrorBoundary>
        <DesignStudio slug={params.slug} initialDesignId={initialDesignId} />
      </DesignErrorBoundary>
    </div>
  );
}

export default function DesignStudioPage() {
  return (
    <Suspense fallback={null}>
      <DesignStudioInner />
    </Suspense>
  );
}
