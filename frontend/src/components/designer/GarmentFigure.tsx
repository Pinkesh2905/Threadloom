'use client';

import React, { useId } from 'react';
import { GARMENT_VIEWBOX } from '@/lib/garmentArt';
import { getGarmentArt, getGarmentSpec } from '@/lib/garmentCatalog';
import type { PrintZone } from '@/types/designer';

interface GarmentFigureProps {
  svgKey: string;
  view: 'front' | 'back';
  color: string;
  /** Dashed max-print-area guide, shown while designing. */
  printZone?: PrintZone;
  /** Artwork layer, rendered inside the garment's clip so nothing floats off fabric. */
  children?: React.ReactNode;
  className?: string;
  /** Cheaper render for grids of thumbnails. */
  detail?: 'full' | 'simple';
}

/**
 * Emits an SVG clipPath matching a garment's silhouette, for clipping the
 * artwork canvas that sits on top of it. Uses objectBoundingBox units with
 * the path scaled into 0..1 so the clip tracks the element's rendered size
 * rather than being pinned to one pixel dimension.
 */
export const GarmentClipPath: React.FC<{ id: string; svgKey: string; view: 'front' | 'back' }> = ({
  id,
  svgKey,
  view,
}) => (
  <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}>
    <defs>
      <clipPath id={id} clipPathUnits="objectBoundingBox">
        <path
          d={getGarmentArt(svgKey, view).body}
          transform={`scale(${1 / GARMENT_VIEWBOX.width}, ${1 / GARMENT_VIEWBOX.height})`}
        />
      </clipPath>
    </defs>
  </svg>
);

/**
 * The garment as layered vector art: flat colour underneath, then edge
 * falloff, a soft centre highlight, drape folds and a woven texture on top
 * — all black/white at low opacity, so a single set of shading works over
 * any garment colour. A photograph would need re-shooting per colour.
 */
export const GarmentFigure: React.FC<GarmentFigureProps> = ({
  svgKey,
  view,
  color,
  printZone,
  children,
  className = '',
  detail = 'full',
}) => {
  const uid = useId().replace(/:/g, '');
  const art = getGarmentArt(svgKey, view);
  const spec = getGarmentSpec(svgKey);
  const pocket = view === 'front' ? spec?.builtInPocket : undefined;
  const rich = detail === 'full';

  const bodyClip = `clip-${uid}`;
  const edgeGrad = `edge-${uid}`;
  const glowGrad = `glow-${uid}`;
  const weavePat = `weave-${uid}`;
  const softBlur = `blur-${uid}`;

  return (
    <svg
      viewBox={`0 0 ${GARMENT_VIEWBOX.width} ${GARMENT_VIEWBOX.height}`}
      className={className}
      aria-hidden="true"
    >
      <defs>
        <clipPath id={bodyClip}>
          <path d={art.body} />
        </clipPath>

        {/* Darkening toward both side seams — the core cue that fabric wraps a body. */}
        <linearGradient id={edgeGrad} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#000" stopOpacity="0.30" />
          <stop offset="18%" stopColor="#000" stopOpacity="0.07" />
          <stop offset="42%" stopColor="#000" stopOpacity="0" />
          <stop offset="60%" stopColor="#000" stopOpacity="0" />
          <stop offset="84%" stopColor="#000" stopOpacity="0.09" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.32" />
        </linearGradient>

        {/* Soft chest highlight, slightly off-centre so it doesn't read as a symmetric gradient. */}
        <radialGradient id={glowGrad} cx="44%" cy="34%" r="52%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.20" />
          <stop offset="55%" stopColor="#fff" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>

        {rich && (
          <pattern id={weavePat} width="4" height="4" patternUnits="userSpaceOnUse">
            <path d="M0,0 L0,4" stroke="#000" strokeWidth="0.5" opacity="0.5" />
            <path d="M0,0 L4,0" stroke="#fff" strokeWidth="0.5" opacity="0.4" />
          </pattern>
        )}

        <filter id={softBlur} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
      </defs>

      {/* Contact shadow on the surface behind the garment. */}
      {rich && (
        <ellipse
          cx={GARMENT_VIEWBOX.width / 2}
          cy={GARMENT_VIEWBOX.height - 12}
          rx={62}
          ry={7}
          fill="#000"
          opacity="0.1"
          filter={`url(#${softBlur})`}
        />
      )}

      {/* Hood bulk and anything else that sits behind the shoulder line. */}
      {art.behind.map((d, i) => (
        <g key={`behind-${i}`}>
          <path d={d} fill={color} stroke="rgba(0,0,0,0.28)" strokeWidth="1" />
          <path d={d} fill="#000" opacity="0.12" />
        </g>
      ))}

      <path d={art.body} fill={color} />

      <g clipPath={`url(#${bodyClip})`}>
        <rect x="0" y="0" width={GARMENT_VIEWBOX.width} height={GARMENT_VIEWBOX.height} fill={`url(#${edgeGrad})`} />
        <rect x="0" y="0" width={GARMENT_VIEWBOX.width} height={GARMENT_VIEWBOX.height} fill={`url(#${glowGrad})`} />

        {rich && (
          <>
            <rect
              x="0"
              y="0"
              width={GARMENT_VIEWBOX.width}
              height={GARMENT_VIEWBOX.height}
              fill={`url(#${weavePat})`}
              opacity="0.05"
            />
            {art.folds.map((d, i) => (
              <path
                key={`fold-${i}`}
                d={d}
                fill="none"
                stroke="#000"
                strokeWidth="3"
                strokeLinecap="round"
                opacity="0.07"
                filter={`url(#${softBlur})`}
              />
            ))}
            {/* Shoulder seam shadow, keeping the top edge from looking pasted on. */}
            <path
              d={art.body}
              fill="none"
              stroke="#000"
              strokeWidth="5"
              opacity="0.13"
              filter={`url(#${softBlur})`}
            />
          </>
        )}

        {/* Built-in pocket (hoodie kangaroo) sits under user artwork. */}
        {pocket && (
          <g>
            <path
              d={
                pocket.kangaroo
                  ? `M${pocket.x},${pocket.y} L${pocket.x + pocket.w},${pocket.y} ` +
                    `L${pocket.x + pocket.w - 6},${pocket.y + pocket.h} L${pocket.x + 6},${pocket.y + pocket.h} Z`
                  : `M${pocket.x},${pocket.y} h${pocket.w} v${pocket.h} h${-pocket.w} Z`
              }
              fill="#000"
              opacity="0.05"
            />
            <path
              d={`M${pocket.x},${pocket.y} L${pocket.x + pocket.w},${pocket.y}`}
              stroke="#000"
              strokeWidth="1"
              opacity="0.2"
              fill="none"
            />
          </g>
        )}

        {/* User artwork — clipped to the garment so it can never float off fabric. */}
        {children}
      </g>

      {/* Collar / cuff / handle panels carry the garment colour plus their own shading. */}
      {art.panels.map((d, i) => (
        <g key={`panel-${i}`}>
          <path d={d} fill={color} stroke="rgba(0,0,0,0.18)" strokeWidth="0.9" />
          <path d={d} fill="#000" opacity="0.07" />
        </g>
      ))}

      {/* Stitching. */}
      {art.seams.map((d, i) => (
        <path
          key={`seam-${i}`}
          d={d}
          fill="none"
          stroke="#000"
          strokeWidth="0.7"
          strokeDasharray="2.5 2"
          opacity="0.28"
          strokeLinecap="round"
        />
      ))}

      {art.buttons.map((b, i) => (
        <circle key={`btn-${i}`} cx={b.x} cy={b.y} r={b.r} fill="#000" opacity="0.28" />
      ))}

      {/* Hood drawstrings. */}
      {spec?.neck.style === 'hood' && view === 'front' && (
        <g stroke="rgba(0,0,0,0.42)" strokeWidth="1.2" fill="none" strokeLinecap="round">
          <path d={`M${GARMENT_VIEWBOX.width / 2 - 7},${spec.shoulder.y + spec.neck.depth + 8} v22`} />
          <path d={`M${GARMENT_VIEWBOX.width / 2 + 7},${spec.shoulder.y + spec.neck.depth + 8} v22`} />
          <circle cx={GARMENT_VIEWBOX.width / 2 - 7} cy={spec.shoulder.y + spec.neck.depth + 32} r="1.6" fill="rgba(0,0,0,0.42)" />
          <circle cx={GARMENT_VIEWBOX.width / 2 + 7} cy={spec.shoulder.y + spec.neck.depth + 32} r="1.6" fill="rgba(0,0,0,0.42)" />
        </g>
      )}

      {/* Outline last so it reads crisp over every layer. */}
      <path d={art.body} fill="none" stroke="rgba(0,0,0,0.30)" strokeWidth="1.1" />

      {printZone && (
        <rect
          x={printZone.x}
          y={printZone.y}
          width={printZone.width}
          height={printZone.height}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="0.9"
          strokeDasharray="3 2.5"
          opacity="0.55"
        />
      )}
    </svg>
  );
};
