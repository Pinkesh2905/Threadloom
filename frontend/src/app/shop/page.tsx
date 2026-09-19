'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowRight, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { StorefrontHeader } from '@/components/StorefrontHeader';
import { GarmentFigure } from '@/components/designer/GarmentFigure';
import type { GarmentTypeSummary, Department } from '@/types/designer';

const DEPARTMENTS: { key: Department; label: string; blurb: string }[] = [
  { key: 'men', label: 'Men', blurb: 'Tees, shirts, hoodies, kurtas, sherwanis.' },
  { key: 'women', label: 'Women', blurb: 'Tees, dresses, kurtis, lehengas, sarees.' },
];

function ShopInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const department = (searchParams.get('department') as Department) ?? 'men';
  const activeCategory = searchParams.get('category') ?? 'all';

  const [garments, setGarments] = useState<GarmentTypeSummary[] | null>(null);

  useEffect(() => {
    setGarments(null);
    api
      .get<GarmentTypeSummary[]>('/catalog/garment-types/', { params: { department } })
      .then((res) => setGarments(res.data))
      .catch(() => setGarments([]));
  }, [department]);

  const categories = useMemo(() => {
    if (!garments) return [];
    const seen = new Map<string, string>();
    for (const g of garments) seen.set(g.category, g.category_label);
    return Array.from(seen.entries());
  }, [garments]);

  const visible = useMemo(
    () => (garments ?? []).filter((g) => activeCategory === 'all' || g.category === activeCategory),
    [garments, activeCategory],
  );

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set(key, value);
    if (key === 'department') next.delete('category');
    router.replace(`/shop?${next.toString()}`);
  };

  return (
    <div className="min-h-screen bg-bg font-sans">
      <StorefrontHeader />

      <main className="max-w-6xl mx-auto px-sp-3 sm:px-sp-4 py-sp-5 pb-24">
        <div className="mb-sp-4">
          <h1 className="font-serif text-3xl sm:text-5xl text-ink">Pick something to make yours.</h1>
          <p className="text-secondary text-sm mt-2 max-w-xl">
            Browse freely — you only need an account when you want to save or order a design.
          </p>
        </div>

        {/* Department */}
        <div className="flex gap-2 mb-sp-3">
          {DEPARTMENTS.map((d) => (
            <button
              key={d.key}
              onClick={() => setParam('department', d.key)}
              className={`px-6 py-3 rounded-full text-xs font-semibold uppercase tracking-wider border transition-colors ${
                department === d.key
                  ? 'bg-ink text-white border-ink'
                  : 'bg-white text-secondary border-hairline hover:text-ink hover:border-ink active:text-ink'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Category */}
        {categories.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-sp-4 pb-sp-3 border-b border-hairline">
            <button
              onClick={() => setParam('category', 'all')}
              className={`px-3.5 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wide border transition-colors ${
                activeCategory === 'all'
                  ? 'bg-accent text-white border-accent'
                  : 'bg-white text-secondary border-hairline hover:text-ink active:text-ink'
              }`}
            >
              All
            </button>
            {categories.map(([key, label]) => (
              <button
                key={key}
                onClick={() => setParam('category', key)}
                className={`px-3.5 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wide border transition-colors ${
                  activeCategory === key
                    ? 'bg-accent text-white border-accent'
                    : 'bg-white text-secondary border-hairline hover:text-ink active:text-ink'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {garments === null ? (
          <div className="flex justify-center py-sp-8">
            <Loader2 className="w-6 h-6 text-secondary animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-sp-3">
            {visible.map((g) => (
              <Link
                key={g.slug}
                href={`/design/${g.slug}`}
                className="editorial-card rounded-2xl p-sp-3 group hover:border-ink active:border-ink transition-colors"
              >
                <div className="bg-surface-subtle rounded-xl p-2 mb-sp-2">
                  <GarmentFigure svgKey={g.svg_key} view="front" color="#FFFFFF" className="w-full h-40" />
                </div>
                <h3 className="font-semibold text-ink text-sm leading-tight">{g.name}</h3>
                <p className="text-[11px] text-secondary mt-0.5">{g.category_label}</p>
                <p className="text-xs text-ink mt-1 tabular-nums font-semibold">From ${g.base_price}</p>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-accent mt-2 group-hover:gap-1.5 transition-[gap]">
                  Design it <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            ))}
          </div>
        )}

        {garments !== null && visible.length === 0 && (
          <p className="text-sm text-secondary py-sp-6 text-center">Nothing in this category yet.</p>
        )}
      </main>
    </div>
  );
}

export default function ShopPage() {
  return (
    <React.Suspense fallback={null}>
      <ShopInner />
    </React.Suspense>
  );
}
