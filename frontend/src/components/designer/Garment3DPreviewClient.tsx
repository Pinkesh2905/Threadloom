'use client';

import dynamic from 'next/dynamic';

// react-three-fiber/three touch `window`/WebGL at import time, so this must
// never be evaluated during SSR.
export const Garment3DPreviewClient = dynamic(
  () => import('./Garment3DPreview').then((mod) => mod.Garment3DPreview),
  { ssr: false }
);
