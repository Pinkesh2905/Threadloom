'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, ArrowRight, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import { Navbar } from '@/components/Navbar';
import { GarmentFigure } from '@/components/designer/GarmentFigure';
import type { Design } from '@/types/designer';

export default function StudioPage() {
  const router = useRouter();
  const { user, isInitialized } = useAuthStore();
  const [designs, setDesigns] = useState<Design[] | null>(null);

  useEffect(() => {
    if (isInitialized && !user) {
      router.replace('/login');
    }
  }, [isInitialized, user, router]);

  useEffect(() => {
    if (user) {
      api.get<Design[]>('/designer/designs/').then((res) => setDesigns(res.data));
    }
  }, [user]);

  if (!isInitialized || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-bg font-sans">
      <Navbar />

      <main className="max-w-4xl mx-auto px-sp-3 sm:px-sp-4 py-sp-6 pb-24 md:pb-sp-6 space-y-sp-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl text-ink">
              Welcome, <span className="italic">{user.display_name || user.email}</span>.
            </h1>
            <p className="text-secondary text-sm mt-1">Your saved designs live here.</p>
          </div>
          <Link
            href="/design"
            className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-ink hover:bg-black active:bg-black active:scale-[0.98] text-white text-xs font-semibold uppercase tracking-wider transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> New Design
          </Link>
        </div>

        {designs === null ? (
          <div className="flex justify-center py-sp-6">
            <Loader2 className="w-6 h-6 text-secondary animate-spin" />
          </div>
        ) : designs.length === 0 ? (
          <div className="editorial-card rounded-3xl p-sp-5 text-center space-y-sp-3">
            <p className="text-secondary text-sm max-w-md mx-auto leading-relaxed">
              You haven&apos;t started a design yet. Pick a garment and start with a blank canvas.
            </p>
            <Link
              href="/design"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-ink hover:bg-black active:bg-black active:scale-[0.98] text-white text-xs font-semibold uppercase tracking-wider transition-colors"
            >
              Start Designing <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-sp-3">
            {designs.map((design) => (
              <Link
                key={design.id}
                href={`/design/${design.garment_type_slug}?d=${design.id}`}
                className="editorial-card rounded-2xl p-sp-3 group hover:border-ink active:border-ink active:bg-surface-subtle transition-colors"
              >
                <div className="bg-surface-subtle rounded-xl p-3 mb-sp-2">
                  <GarmentFigure
                    svgKey={design.garment_type_svg_key}
                    view="front"
                    color={design.base_color}
                    className="w-full h-32"
                  />
                </div>
                <p className="text-sm font-semibold text-ink truncate">
                  {design.name || `Design #${design.id}`}
                </p>
                <p className="text-xs text-secondary mt-0.5 tabular-nums">${design.price}</p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
