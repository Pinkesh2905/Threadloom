'use client';

import React, { useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Loader2, ShoppingBag } from 'lucide-react';
import { api } from '@/lib/api';
import { ThreadloomLogo } from '@/components/ThreadloomLogo';
import { GarmentFigure, GarmentClipPath } from '@/components/designer/GarmentFigure';
import { GarmentCanvasClient } from '@/components/designer/GarmentCanvasClient';
import { GARMENT_VIEWBOX } from '@/lib/garmentArt';
import type { PublicDesign, GarmentTypeDetail } from '@/types/designer';

const DISPLAY_WIDTH = 360;
const DISPLAY_HEIGHT = (GARMENT_VIEWBOX.height / GARMENT_VIEWBOX.width) * DISPLAY_WIDTH;

export default function SharedDesignPage() {
  const { token } = useParams<{ token: string }>();
  const [design, setDesign] = useState<PublicDesign | null>(null);
  const [garmentType, setGarmentType] = useState<GarmentTypeDetail | null>(null);
  const [activeZoneKey, setActiveZoneKey] = useState('');
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get<PublicDesign>(`/designer/designs/shared/${token}/`)
      .then(async (res) => {
        if (cancelled) return;
        setDesign(res.data);
        const gtRes = await api.get<GarmentTypeDetail>(`/catalog/garment-types/${res.data.garment_type_slug}/`);
        if (cancelled) return;
        setGarmentType(gtRes.data);
        setActiveZoneKey(gtRes.data.print_zones[0]?.key ?? '');
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const clipId = useId().replace(/:/g, '');
  const garmentView: 'front' | 'back' = activeZoneKey === 'back' ? 'back' : 'front';
  const zoneLayers = design?.layers.filter((l) => l.zone === activeZoneKey) ?? [];

  if (notFound) {
    return (
      <div className="min-h-screen bg-bg font-sans flex items-center justify-center px-sp-3">
        <div className="text-center space-y-sp-2">
          <p className="text-sm text-secondary">This design link doesn&apos;t exist or is no longer available.</p>
          <Link href="/" className="text-xs font-semibold text-accent">
            Go to Threadloom
          </Link>
        </div>
      </div>
    );
  }

  if (!design || !garmentType) {
    return (
      <div className="min-h-screen bg-bg font-sans flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-secondary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg font-sans">
      <header className="sticky top-0 z-10 w-full bg-white/95 backdrop-blur-md border-b border-hairline">
        <div className="max-w-3xl mx-auto px-sp-3 sm:px-sp-4 h-16 flex items-center">
          <Link href="/">
            <ThreadloomLogo size="sm" />
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-sp-3 sm:px-sp-4 py-sp-5 pb-24 space-y-sp-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-secondary">Shared Design</p>
          <h1 className="font-serif text-2xl sm:text-3xl text-ink">
            {design.name || `${garmentType.name} design`}
          </h1>
          {design.author_name && <p className="text-xs text-secondary mt-1">By {design.author_name}</p>}
        </div>

        {garmentType.print_zones.length > 1 && (
          <div className="flex gap-2">
            {garmentType.print_zones.map((zone) => (
              <button
                key={zone.key}
                onClick={() => setActiveZoneKey(zone.key)}
                className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider border transition-colors ${
                  activeZoneKey === zone.key
                    ? 'bg-ink text-white border-ink'
                    : 'bg-white text-secondary border-hairline hover:text-ink active:text-ink'
                }`}
              >
                {zone.label}
              </button>
            ))}
          </div>
        )}

        <div className="overflow-x-auto">
          <div
            className="relative mx-auto bg-surface-subtle rounded-3xl border border-hairline"
            style={{ width: DISPLAY_WIDTH, height: DISPLAY_HEIGHT }}
          >
            <GarmentClipPath id={clipId} svgKey={garmentType.svg_key} view={garmentView} />
            <GarmentFigure
              svgKey={garmentType.svg_key}
              view={garmentView}
              color={design.base_color}
              className="absolute inset-0 w-full h-full"
            />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ clipPath: `url(#${clipId})`, WebkitClipPath: `url(#${clipId})` }}
            >
              <GarmentCanvasClient
                widthPx={DISPLAY_WIDTH}
                heightPx={DISPLAY_HEIGHT}
                layers={zoneLayers}
                selectedLayerId={null}
                onSelect={() => {}}
                onChangeLayer={() => {}}
              />
            </div>
          </div>
        </div>

        <div className="editorial-card rounded-2xl p-sp-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-secondary">Price</p>
            <p className="text-xl font-bold text-ink tabular-nums">${design.price}</p>
          </div>
          <Link
            href="/register"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-ink hover:bg-black active:bg-black active:scale-[0.98] text-white text-xs font-semibold uppercase tracking-wider transition-colors"
          >
            <ShoppingBag className="w-3.5 h-3.5" /> Sign Up to Order
          </Link>
        </div>
      </main>
    </div>
  );
}
