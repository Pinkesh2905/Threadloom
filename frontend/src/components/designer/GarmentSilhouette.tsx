'use client';

import React from 'react';
import { GARMENT_VIEWBOX, getGarmentSvg } from '@/lib/garmentSvgs';
import type { PrintZone } from '@/types/designer';

interface GarmentSilhouetteProps {
  svgKey: string;
  view: 'front' | 'back';
  color: string;
  activeZone?: PrintZone;
  className?: string;
}

/**
 * The garment as flat vector art. Recoloring is a plain `fill` swap on the
 * path — no photo, no pixel-level color math needed, unlike a photographed
 * garment template would require.
 */
export const GarmentSilhouette: React.FC<GarmentSilhouetteProps> = ({
  svgKey,
  view,
  color,
  activeZone,
  className = '',
}) => {
  const svg = getGarmentSvg(svgKey);
  const bodyPath = view === 'front' ? svg.front : svg.back;

  return (
    <svg
      viewBox={`0 0 ${GARMENT_VIEWBOX.width} ${GARMENT_VIEWBOX.height}`}
      className={className}
      aria-hidden="true"
    >
      <path d={bodyPath} fill={color} stroke="rgba(33,26,22,0.15)" strokeWidth="1.5" />
      {view === 'front' && svg.frontOverlay && (
        <path d={svg.frontOverlay} fill={color} stroke="rgba(33,26,22,0.15)" strokeWidth="1.5" />
      )}
      {view === 'front' && svg.frontStrokeOverlay && (
        <path d={svg.frontStrokeOverlay} fill="none" stroke="rgba(33,26,22,0.35)" strokeWidth="1.5" />
      )}
      {activeZone && (
        <rect
          x={activeZone.x}
          y={activeZone.y}
          width={activeZone.width}
          height={activeZone.height}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="1"
          strokeDasharray="3 2"
          opacity={0.6}
        />
      )}
    </svg>
  );
};
