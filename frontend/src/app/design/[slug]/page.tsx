'use client';

import React, { Suspense, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Navbar } from '@/components/Navbar';
import { DesignStudio } from '@/components/designer/DesignStudio';

function DesignStudioInner() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const { user, isInitialized } = useAuthStore();

  useEffect(() => {
    if (isInitialized && !user) {
      router.replace('/login');
    }
  }, [isInitialized, user, router]);

  if (!isInitialized || !user) {
    return null;
  }

  const designIdParam = searchParams.get('d');
  const initialDesignId = designIdParam ? Number(designIdParam) : undefined;

  return (
    <div className="min-h-screen bg-bg font-sans">
      <Navbar />
      <DesignStudio slug={params.slug} initialDesignId={initialDesignId} />
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
