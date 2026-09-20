'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import { Navbar } from '@/components/Navbar';
import { GarmentFigure } from '@/components/designer/GarmentFigure';
import { formatMoney } from '@/lib/currency';
import type { Design } from '@/types/designer';

export default function TemplateGalleryPage() {
  const router = useRouter();
  const { user, isInitialized } = useAuthStore();
  const [templates, setTemplates] = useState<Design[] | null>(null);
  const [cloningId, setCloningId] = useState<number | null>(null);

  useEffect(() => {
    if (isInitialized && !user) {
      router.replace('/login');
    }
  }, [isInitialized, user, router]);

  useEffect(() => {
    if (user) {
      api.get<Design[]>('/designer/designs/gallery/').then((res) => setTemplates(res.data));
    }
  }, [user]);

  const useTemplate = async (template: Design) => {
    setCloningId(template.id);
    try {
      const res = await api.post<Design>(`/designer/designs/${template.id}/clone/`);
      router.push(`/design/${res.data.garment_type_slug}?d=${res.data.id}`);
    } catch {
      setCloningId(null);
    }
  };

  if (!isInitialized || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-bg font-sans">
      <Navbar />
      <main className="max-w-5xl mx-auto px-sp-3 sm:px-sp-4 py-sp-5 pb-24 md:pb-sp-6">
        <div className="mb-sp-4">
          <h1 className="font-serif text-3xl sm:text-4xl text-ink">Template Gallery</h1>
          <p className="text-secondary text-sm mt-1">Start from a design someone else shared, then make it yours.</p>
        </div>

        {templates === null ? (
          <div className="flex justify-center py-sp-6">
            <Loader2 className="w-6 h-6 text-secondary animate-spin" />
          </div>
        ) : templates.length === 0 ? (
          <div className="editorial-card rounded-2xl p-sp-5 text-center space-y-sp-2">
            <Sparkles className="w-8 h-8 text-secondary mx-auto" />
            <p className="text-sm text-secondary">No public templates yet — be the first to share one from the studio.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-sp-3">
            {templates.map((template) => (
              <div key={template.id} className="editorial-card rounded-2xl p-sp-3">
                <div className="bg-surface-subtle rounded-xl p-3 mb-sp-2">
                  <GarmentFigure
                    svgKey={template.garment_type_svg_key}
                    view="front"
                    color={template.base_color}
                    className="w-full h-32"
                  />
                </div>
                <p className="text-sm font-semibold text-ink truncate">{template.name || 'Untitled Design'}</p>
                <p className="text-xs text-secondary mt-0.5">
                  by {template.author_name} &middot; <span className="tabular-nums">{formatMoney(template.price)}</span>
                </p>
                <button
                  onClick={() => useTemplate(template)}
                  disabled={cloningId === template.id}
                  className="w-full mt-sp-2 py-2 rounded-full bg-ink hover:bg-black active:bg-black active:scale-[0.98] text-white text-xs font-semibold uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                >
                  {cloningId === template.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Use This Template'}
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
