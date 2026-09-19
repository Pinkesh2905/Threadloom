/**
 * Fonts a customer can set text in.
 *
 * These are referenced by their real family name rather than a CSS variable
 * because Konva writes the family straight into the canvas `font` property,
 * where CSS custom properties don't resolve. They're loaded as ordinary web
 * fonts in the root layout; `ensureDesignFontsLoaded` waits for them so the
 * canvas doesn't bake text in a fallback face.
 */

export interface DesignFont {
  /** Stored on the layer. Stable — don't rename without a data migration. */
  key: string;
  label: string;
  /** Real CSS/canvas family name. */
  family: string;
  /** Rough grouping shown in the picker. */
  group: 'Sans' | 'Serif' | 'Display' | 'Script';
  weight?: number;
}

export const DESIGN_FONTS: DesignFont[] = [
  { key: 'sans', label: 'Inter', family: 'Inter, system-ui, sans-serif', group: 'Sans' },
  { key: 'montserrat', label: 'Montserrat', family: 'Montserrat, sans-serif', group: 'Sans', weight: 700 },
  { key: 'oswald', label: 'Oswald', family: 'Oswald, sans-serif', group: 'Sans', weight: 600 },
  { key: 'serif', label: 'Fraunces', family: 'Fraunces, Georgia, serif', group: 'Serif' },
  { key: 'playfair', label: 'Playfair', family: '"Playfair Display", Georgia, serif', group: 'Serif', weight: 700 },
  { key: 'anton', label: 'Anton', family: 'Anton, Impact, sans-serif', group: 'Display' },
  { key: 'bebas', label: 'Bebas Neue', family: '"Bebas Neue", Impact, sans-serif', group: 'Display' },
  { key: 'bungee', label: 'Bungee', family: 'Bungee, Impact, sans-serif', group: 'Display' },
  { key: 'righteous', label: 'Righteous', family: 'Righteous, sans-serif', group: 'Display' },
  { key: 'lobster', label: 'Lobster', family: 'Lobster, cursive', group: 'Script' },
  { key: 'pacifico', label: 'Pacifico', family: 'Pacifico, cursive', group: 'Script' },
  { key: 'caveat', label: 'Caveat', family: 'Caveat, cursive', group: 'Script', weight: 600 },
];

const DEFAULT_FONT = DESIGN_FONTS[0];

export function getDesignFont(key: string | undefined): DesignFont {
  return DESIGN_FONTS.find((f) => f.key === key) ?? DEFAULT_FONT;
}

export const FONT_GROUPS = ['Sans', 'Serif', 'Display', 'Script'] as const;

/** Google Fonts stylesheet covering every non-local family above. */
export const DESIGN_FONTS_HREF =
  'https://fonts.googleapis.com/css2' +
  '?family=Anton' +
  '&family=Bebas+Neue' +
  '&family=Bungee' +
  '&family=Caveat:wght@600' +
  '&family=Lobster' +
  '&family=Montserrat:wght@700' +
  '&family=Oswald:wght@600' +
  '&family=Pacifico' +
  '&family=Playfair+Display:wght@700' +
  '&family=Righteous' +
  '&display=swap';

let fontsReady: Promise<void> | null = null;

/**
 * Canvas text renders in whatever face is available at draw time, so a
 * freshly-picked font would silently fall back to Inter until something
 * else forced a redraw. Resolve once every design face is actually loaded.
 */
export function ensureDesignFontsLoaded(): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();
  if (fontsReady) return fontsReady;

  const fontSet = (document as Document & { fonts?: FontFaceSet }).fonts;
  if (!fontSet) return Promise.resolve();

  fontsReady = Promise.all(
    DESIGN_FONTS.map((font) => fontSet.load(`${font.weight ?? 400} 32px ${font.family}`).catch(() => undefined)),
  ).then(() => undefined);

  return fontsReady;
}
