'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Type } from 'lucide-react';

interface Swatch {
  name: string;
  hex: string;
}

const SWATCHES: Swatch[] = [
  { name: 'Rust', hex: '#B14A20' },
  { name: 'Ink', hex: '#141414' },
  { name: 'Linen', hex: '#F5EEE4' },
  { name: 'Olive', hex: '#5B6146' },
  { name: 'Indigo', hex: '#26344D' },
];

/**
 * WCAG relative-luminance check — deterministic contrast pick (white vs ink
 * print) with zero ML involved, the same class of "smart but not AI" rule
 * this product is built on.
 */
function contrastingTextColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const luminance = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return luminance > 0.5 ? '#141414' : '#FFFFFF';
}

const SHIRT_PATH =
  'M100,14 C90,14 82,20 78,26 L60,14 L20,54 L52,72 L52,200 L148,200 L148,72 L180,54 L140,14 L122,26 C118,20 110,14 100,14 Z';

export const GarmentTeaser: React.FC = () => {
  const [color, setColor] = useState<Swatch>(SWATCHES[0]);
  const [text, setText] = useState('YOUR TEXT');

  const textColor = useMemo(() => contrastingTextColor(color.hex), [color]);
  const isLong = text.length > 10;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="editorial-card rounded-3xl p-sp-4 sm:p-sp-5 grid grid-cols-1 sm:grid-cols-2 gap-sp-4 items-center max-w-4xl mx-auto"
    >
      {/* Live garment preview */}
      <div className="flex items-center justify-center bg-surface-subtle rounded-2xl border border-hairline p-6 min-h-[260px]">
        <svg viewBox="0 0 200 220" width="200" height="220" aria-label="Live garment preview">
          <path d={SHIRT_PATH} fill={color.hex} stroke="rgba(33,26,22,0.15)" strokeWidth="2" />
          <text
            x="100"
            y="128"
            textAnchor="middle"
            fontFamily="var(--font-fraunces), Georgia, serif"
            fontStyle="italic"
            fontSize="20"
            fill={textColor}
            textLength={isLong ? 84 : undefined}
            lengthAdjust="spacingAndGlyphs"
          >
            {text || ' '}
          </text>
        </svg>
      </div>

      {/* Controls */}
      <div className="space-y-sp-3">
        <span className="text-secondary text-xs font-semibold uppercase tracking-wider">
          Try It — No Account Needed
        </span>
        <h3 className="font-serif text-2xl sm:text-3xl text-ink leading-snug">
          Pick a color. Add your text. <span className="italic">See it instantly.</span>
        </h3>

        <div>
          <label className="block font-semibold text-secondary mb-2 uppercase tracking-wide text-[11px]">
            Garment Color
          </label>
          <div className="flex flex-wrap gap-2">
            {SWATCHES.map((s) => (
              <button
                key={s.hex}
                type="button"
                onClick={() => setColor(s)}
                title={s.name}
                className={`w-8 h-8 rounded-full border-2 transition-transform ${
                  color.hex === s.hex ? 'border-accent scale-110' : 'border-hairline'
                }`}
                style={{ backgroundColor: s.hex }}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="block font-semibold text-secondary mb-2 uppercase tracking-wide text-[11px]">
            Print Text
          </label>
          <div className="relative">
            <Type className="w-4 h-4 text-secondary absolute left-3 top-3" />
            <input
              type="text"
              maxLength={20}
              value={text}
              onChange={(e) => setText(e.target.value.toUpperCase())}
              className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-surface-subtle border border-hairline text-xs text-ink placeholder:text-secondary/60 focus:bg-white focus:outline-none focus:border-ink transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
              placeholder="YOUR TEXT"
            />
          </div>
        </div>

        <p className="text-[11px] text-secondary leading-relaxed">
          The full studio adds layered images, pockets, sleeve prints and a live price — all rendered
          with plain image processing, not a generative model.
        </p>
      </div>
    </motion.div>
  );
};
