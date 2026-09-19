/**
 * The garment catalogue: one spec per `GarmentType.svg_key`.
 *
 * Numbers are in the shared 200x280 viewBox (see garmentArt.ts). Most
 * garments are parametric; bags and caps supply their own outline because
 * they aren't a torso with sleeves.
 */

import {
  buildGarmentArt,
  customGarmentArt,
  type CustomGarment,
  type GarmentArt,
  type GarmentSpec,
} from './garmentArt';

type CatalogEntry = { spec: GarmentSpec } | { custom: CustomGarment };

const SHOULDER_Y = 44;

/** Standard adult unisex torso — the base most tops vary from. */
const baseTorso = {
  chestHalf: 48,
  waistHalf: 46,
  hemHalf: 47,
  hemY: 206,
};

/** Narrower, waist-shaped block for womenswear. */
const fittedTorso = {
  chestHalf: 43,
  waistHalf: 38,
  hemHalf: 44,
  hemY: 198,
};

export const GARMENT_CATALOG: Record<string, CatalogEntry> = {
  // ---------------------------------------------------------------- tops
  tee: {
    spec: {
      neck: { halfWidth: 19, depth: 13, style: 'crew' },
      shoulder: { y: SHOULDER_Y, halfWidth: 46, slope: 5 },
      sleeve: { kind: 'short' },
      torso: baseTorso,
    },
  },

  'womens-tee': {
    spec: {
      neck: { halfWidth: 21, depth: 19, style: 'scoop' },
      shoulder: { y: SHOULDER_Y, halfWidth: 41, slope: 5 },
      sleeve: { kind: 'short', endHalfWidth: 11 },
      torso: { ...fittedTorso, hemStyle: 'curved' },
    },
  },

  tank: {
    spec: {
      neck: { halfWidth: 22, depth: 22, style: 'scoop' },
      shoulder: { y: SHOULDER_Y, halfWidth: 30, slope: 3 },
      sleeve: { kind: 'none' },
      torso: baseTorso,
    },
  },

  'crop-top': {
    spec: {
      neck: { halfWidth: 21, depth: 18, style: 'scoop' },
      shoulder: { y: SHOULDER_Y, halfWidth: 40, slope: 5 },
      sleeve: { kind: 'short', endHalfWidth: 11 },
      torso: { chestHalf: 42, waistHalf: 39, hemHalf: 40, hemY: 150, hemStyle: 'straight' },
    },
  },

  polo: {
    spec: {
      neck: { halfWidth: 17, depth: 12, style: 'polo' },
      shoulder: { y: SHOULDER_Y, halfWidth: 46, slope: 5 },
      sleeve: { kind: 'short' },
      torso: { ...baseTorso, hemStyle: 'curved' },
      placket: { width: 11, buttons: 3, toY: 96 },
    },
  },

  shirt: {
    spec: {
      neck: { halfWidth: 17, depth: 11, style: 'collar' },
      shoulder: { y: SHOULDER_Y, halfWidth: 47, slope: 5 },
      sleeve: { kind: 'long', endHalfWidth: 12 },
      torso: { ...baseTorso, hemStyle: 'curved' },
      placket: { width: 12, buttons: 7 },
    },
  },

  // ------------------------------------------------------------ sweats
  sweatshirt: {
    spec: {
      neck: { halfWidth: 19, depth: 13, style: 'crew' },
      shoulder: { y: SHOULDER_Y, halfWidth: 49, slope: 6 },
      sleeve: { kind: 'long', endHalfWidth: 13 },
      torso: { ...baseTorso, chestHalf: 51, waistHalf: 50, hemHalf: 50 },
      ribbed: true,
    },
  },

  hoodie: {
    spec: {
      neck: { halfWidth: 20, depth: 15, style: 'hood' },
      shoulder: { y: SHOULDER_Y + 4, halfWidth: 50, slope: 6 },
      sleeve: { kind: 'long', endHalfWidth: 13 },
      torso: { ...baseTorso, chestHalf: 52, waistHalf: 51, hemHalf: 51, hemY: 210 },
      builtInPocket: { x: 62, y: 150, w: 76, h: 34, kangaroo: true },
      ribbed: true,
    },
  },

  'womens-hoodie': {
    spec: {
      neck: { halfWidth: 19, depth: 15, style: 'hood' },
      shoulder: { y: SHOULDER_Y + 4, halfWidth: 44, slope: 6 },
      sleeve: { kind: 'long', endHalfWidth: 12 },
      torso: { chestHalf: 45, waistHalf: 41, hemHalf: 45, hemY: 200 },
      builtInPocket: { x: 68, y: 145, w: 64, h: 30, kangaroo: true },
      ribbed: true,
    },
  },

  bomber: {
    spec: {
      neck: { halfWidth: 18, depth: 11, style: 'mandarin' },
      shoulder: { y: SHOULDER_Y, halfWidth: 50, slope: 6 },
      sleeve: { kind: 'long', endHalfWidth: 13 },
      torso: { chestHalf: 52, waistHalf: 50, hemHalf: 48, hemY: 196 },
      placket: { width: 7, buttons: 0 },
      ribbed: true,
    },
  },

  // ----------------------------------------------------- Indian / ethnic
  kurta: {
    spec: {
      neck: { halfWidth: 17, depth: 14, style: 'mandarin' },
      shoulder: { y: SHOULDER_Y, halfWidth: 46, slope: 5 },
      sleeve: { kind: 'long', endHalfWidth: 13 },
      torso: { chestHalf: 49, waistHalf: 49, hemHalf: 53, hemY: 252, sideSlit: 0.28 },
      placket: { width: 10, buttons: 4, toY: 108 },
    },
  },

  kurti: {
    spec: {
      neck: { halfWidth: 18, depth: 20, style: 'v' },
      shoulder: { y: SHOULDER_Y, halfWidth: 42, slope: 5 },
      sleeve: { kind: 'threequarter', endHalfWidth: 11 },
      torso: { chestHalf: 44, waistHalf: 42, hemHalf: 54, hemY: 238, hemStyle: 'aline', sideSlit: 0.24 },
    },
  },

  anarkali: {
    spec: {
      neck: { halfWidth: 18, depth: 22, style: 'v' },
      shoulder: { y: SHOULDER_Y, halfWidth: 41, slope: 5 },
      sleeve: { kind: 'threequarter', endHalfWidth: 10 },
      torso: { chestHalf: 42, waistHalf: 36, hemHalf: 76, hemY: 258, hemStyle: 'flared' },
    },
  },

  'salwar-kameez': {
    spec: {
      neck: { halfWidth: 18, depth: 18, style: 'mandarin' },
      shoulder: { y: SHOULDER_Y, halfWidth: 42, slope: 5 },
      sleeve: { kind: 'threequarter', endHalfWidth: 11 },
      torso: { chestHalf: 45, waistHalf: 44, hemHalf: 50, hemY: 244, sideSlit: 0.3 },
    },
  },

  'saree-blouse': {
    spec: {
      neck: { halfWidth: 20, depth: 17, style: 'scoop' },
      shoulder: { y: SHOULDER_Y, halfWidth: 38, slope: 4 },
      sleeve: { kind: 'cap', endHalfWidth: 12 },
      torso: { chestHalf: 41, waistHalf: 40, hemHalf: 41, hemY: 124 },
    },
  },

  sherwani: {
    spec: {
      neck: { halfWidth: 17, depth: 13, style: 'mandarin' },
      shoulder: { y: SHOULDER_Y, halfWidth: 47, slope: 5 },
      sleeve: { kind: 'long', endHalfWidth: 13 },
      torso: { chestHalf: 49, waistHalf: 46, hemHalf: 54, hemY: 264 },
      placket: { width: 9, buttons: 8, toY: 250 },
    },
  },

  'nehru-jacket': {
    spec: {
      neck: { halfWidth: 17, depth: 13, style: 'mandarin' },
      shoulder: { y: SHOULDER_Y, halfWidth: 44, slope: 5 },
      sleeve: { kind: 'none' },
      torso: { chestHalf: 47, waistHalf: 45, hemHalf: 48, hemY: 196 },
      placket: { width: 9, buttons: 5, toY: 186 },
    },
  },

  dress: {
    spec: {
      neck: { halfWidth: 21, depth: 19, style: 'scoop' },
      shoulder: { y: SHOULDER_Y, halfWidth: 40, slope: 5 },
      sleeve: { kind: 'cap', endHalfWidth: 12 },
      torso: { chestHalf: 42, waistHalf: 35, hemHalf: 64, hemY: 246, hemStyle: 'aline' },
    },
  },

  // --------------------------------------------------------- non-torso
  lehenga: {
    custom: {
      // Floor-length flared skirt with a gathered waistband.
      body:
        'M72,70 L128,70 L133,86 C160,104 178,168 186,252 ' +
        'Q100,268 14,252 C22,168 40,104 67,86 Z',
      seams: [
        'M72,84 L128,84',
        'M100,88 L100,250',
        'M66,104 Q58,178 40,246',
        'M134,104 Q142,178 160,246',
      ],
      folds: [
        'M84,110 Q78,180 68,244',
        'M116,110 Q122,180 132,244',
        'M100,120 Q100,186 100,242',
      ],
      panels: ['M70,66 L130,66 L131,84 L69,84 Z'],
    },
  },

  dupatta: {
    custom: {
      // A draped stole — the printable face is the flat panel.
      body:
        'M40,42 Q100,28 160,42 L172,228 Q100,248 28,228 Z',
      seams: ['M46,52 L46,222', 'M154,52 L154,222'],
      folds: ['M72,56 Q66,140 76,220', 'M128,56 Q134,140 124,220', 'M100,50 Q100,140 100,232'],
    },
  },

  tote: {
    custom: {
      body: 'M40,88 L160,88 L168,244 L32,244 Z',
      seams: ['M40,98 L160,98', 'M38,234 L162,234'],
      folds: ['M64,104 Q60,170 66,230', 'M136,104 Q140,170 134,230'],
      panels: [
        // Handles.
        'M66,88 C66,44 92,36 92,36 L98,40 C98,40 76,48 76,88 Z',
        'M134,88 C134,44 108,36 108,36 L102,40 C102,40 124,48 124,88 Z',
      ],
    },
  },

  cap: {
    custom: {
      body: 'M46,150 C46,86 154,86 154,150 Z',
      seams: ['M100,92 L100,150', 'M72,100 Q82,126 80,150', 'M128,100 Q118,126 120,150'],
      folds: [],
      panels: [
        // Brim.
        'M44,150 Q100,140 156,150 Q160,176 100,180 Q40,176 44,150 Z',
      ],
    },
  },
};

export function getGarmentArt(svgKey: string, face: 'front' | 'back'): GarmentArt {
  const entry = GARMENT_CATALOG[svgKey] ?? GARMENT_CATALOG.tee;
  return 'custom' in entry ? customGarmentArt(entry.custom, face) : buildGarmentArt(entry.spec, face);
}

export function getGarmentSpec(svgKey: string): GarmentSpec | null {
  const entry = GARMENT_CATALOG[svgKey] ?? GARMENT_CATALOG.tee;
  return 'spec' in entry ? entry.spec : null;
}

export const GARMENT_KEYS = Object.keys(GARMENT_CATALOG);
