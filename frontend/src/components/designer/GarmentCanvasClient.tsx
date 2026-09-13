'use client';

import dynamic from 'next/dynamic';

// Konva touches `window` at import time, so the canvas must never be
// evaluated during SSR.
export const GarmentCanvasClient = dynamic(
  () => import('./GarmentCanvas').then((mod) => mod.GarmentCanvas),
  { ssr: false }
);
