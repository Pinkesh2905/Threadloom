'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import { Navbar } from '@/components/Navbar';
import { GarmentFigure } from '@/components/designer/GarmentFigure';
import { formatMoney } from '@/lib/currency';
import type { GarmentTypeSummary } from '@/types/designer';

export default function GarmentPickerPage() {
  const router = useRouter();
  const { user, isInitialized } = useAuthStore();
  const [garmentTypes, setGarmentTypes] = useState<GarmentTypeSummary[]>([]);

  useEffect(() => {
    if (isInitialized && !user) {
      router.replace('/login');
    }
  }, [isInitialized, user, router]);

  useEffect(() => {
    api.get<GarmentTypeSummary[]>('/catalog/garment-types/').then((res) => setGarmentTypes(res.data));
  }, []);

  if (!isInitialized || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-bg font-sans">
      <Navbar />
      <main className="max-w-5xl mx-auto px-sp-3 sm:px-sp-4 py-sp-5 pb-24 md:pb-sp-6">
        <div className="mb-sp-4">
          <h1 className="font-serif text-3xl sm:text-4xl text-ink">Choose a garment.</h1>
          <p className="text-secondary text-sm mt-1">Every design starts with a blank canvas.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-sp-3">
          {garmentTypes.map((gt) => (
            <Link
              key={gt.slug}
              href={`/design/${gt.slug}`}
              className="editorial-card rounded-2xl p-sp-3 text-center group hover:border-ink active:border-ink active:bg-surface-subtle transition-colors"
            >
              <div className="bg-surface-subtle rounded-xl p-4 mb-sp-2">
                <GarmentFigure svgKey={gt.svg_key} view="front" color="#FFFFFF" className="w-full h-40" />
              </div>
              <h3 className="font-semibold text-ink text-sm">{gt.name}</h3>
              <p className="text-xs text-secondary mt-0.5">From {formatMoney(gt.base_price)}</p>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-accent mt-2 group-hover:gap-1.5 transition-[gap] duration-200">
                Start Designing <ArrowRight className="w-3 h-3" />
              </span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
