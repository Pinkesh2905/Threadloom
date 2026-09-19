/**
 * Parametric garment artwork.
 *
 * Every garment is generated from a small spec (neckline, shoulder, sleeve,
 * torso) rather than a hand-written path string, because most garments are
 * the same construction with different numbers — a kurta is a long tee with
 * a mandarin collar and side slits; a hoodie is a sweatshirt with a hood.
 * Adding a garment is a spec, not a drawing.
 *
 * Shared viewBox "0 0 200 280" is the same coordinate space PrintZone
 * x/y/width/height live in, so print-area guides line up with the garment
 * drawn underneath, and artwork can be placed anywhere on the body and
 * clipped to this silhouette.
 *
 * Realism comes from layered vector shading (edge falloff, centre highlight,
 * fold lines, weave texture, seam stitching) rather than photography — it
 * recolours to any garment colour by construction, which a photo cannot.
 */

export const GARMENT_VIEWBOX = { width: 200, height: 280 };
const CX = GARMENT_VIEWBOX.width / 2;

export type NeckStyle = 'crew' | 'v' | 'scoop' | 'deep-v' | 'mandarin' | 'polo' | 'collar' | 'boat' | 'hood';
export type SleeveKind = 'none' | 'cap' | 'short' | 'threequarter' | 'long';
export type HemStyle = 'straight' | 'curved' | 'flared' | 'aline' | 'asymmetric';

export interface GarmentSpec {
  neck: { halfWidth: number; depth: number; backDepth?: number; style: NeckStyle };
  shoulder: { y: number; halfWidth: number; slope: number };
  sleeve: { kind: SleeveKind; endHalfWidth?: number; taper?: number };
  torso: {
    chestHalf: number;
    waistHalf: number;
    hemHalf: number;
    hemY: number;
    hemStyle?: HemStyle;
    /** Vertical side slits, as a fraction of body length (kurta, kurti). */
    sideSlit?: number;
  };
  /** Front-opening placket: button-through shirts, sherwani, nehru jacket. */
  placket?: { width: number; buttons: number; toY?: number };
  /** Drawn-on patch pocket that is part of the garment, not user artwork. */
  builtInPocket?: { x: number; y: number; w: number; h: number; kangaroo?: boolean };
  hood?: boolean;
  /** Ribbed cuff/hem bands — sweatshirts, bombers. */
  ribbed?: boolean;
  /** Separate lower garment drawn below the torso (lehenga skirt, salwar). */
  skirt?: { topY: number; topHalf: number; hemHalf: number; hemY: number; pleats?: number };
}

export interface GarmentArt {
  /** Outline of the wearable surface — also the clip path for artwork. */
  body: string;
  /** Drawn *before* the body so the shoulders overlap it — hoods, collars
   *  that sit behind the neck. Without this a hood reads as a balloon
   *  floating above the garment rather than fabric resting behind it. */
  behind: string[];
  /** Interior seams and topstitching, stroked not filled. */
  seams: string[];
  /** Soft dark shapes, drawn multiply-ish over the body. */
  folds: string[];
  /** Collar/cuff/waistband panels, filled with the garment colour. */
  panels: string[];
  /** Hardware — buttons and similar, drawn as small circles. */
  buttons: { x: number; y: number; r: number }[];
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Mirror a list of right-hand-side points to the left of centre. */
const mirrorX = (x: number) => r1(CX - (x - CX));

function necklinePath(spec: GarmentSpec, face: 'front' | 'back'): string {
  const { halfWidth, style } = spec.neck;
  const depth = face === 'front' ? spec.neck.depth : spec.neck.backDepth ?? spec.neck.depth * 0.4;
  const top = spec.shoulder.y;
  const left = CX - halfWidth;
  const right = CX + halfWidth;

  if (style === 'v' || style === 'deep-v') {
    return `L${r1(CX)},${r1(top + depth)} L${r1(right)},${r1(top)}`;
  }
  if (style === 'boat') {
    return `Q${r1(CX)},${r1(top + depth * 0.7)} ${r1(right)},${r1(top)}`;
  }
  if (style === 'mandarin' || style === 'polo' || style === 'collar') {
    return `Q${r1(CX)},${r1(top + depth)} ${r1(right)},${r1(top)}`;
  }
  // crew / scoop / hood
  return `C${r1(left + halfWidth * 0.25)},${r1(top + depth)} ${r1(right - halfWidth * 0.25)},${r1(top + depth)} ${r1(right)},${r1(top)}`;
}

function sleeveOutline(spec: GarmentSpec): { out: string; armpitY: number } {
  const { shoulder, sleeve, torso } = spec;
  const shoulderX = CX + shoulder.halfWidth;
  const shoulderTipY = shoulder.y + shoulder.slope;
  const armpitY = shoulder.y + 46;

  if (sleeve.kind === 'none') {
    // Sleeveless: scoop straight from shoulder tip into the armhole.
    return {
      out: `Q${r1(shoulderX + 2)},${r1(shoulderTipY + 20)} ${r1(CX + torso.chestHalf)},${r1(armpitY)}`,
      armpitY,
    };
  }

  const lengths: Record<Exclude<SleeveKind, 'none'>, number> = {
    cap: 18,
    short: 46,
    threequarter: 92,
    long: 128,
  };
  const length = lengths[sleeve.kind];
  const taper = sleeve.taper ?? 0.72;
  const endHalf = sleeve.endHalfWidth ?? 17 * taper;

  // Outer edge of the sleeve, angled away from the body as it drops.
  const spread = sleeve.kind === 'long' ? 10 : 14;
  const endOuterX = shoulderX + spread;
  const endOuterY = shoulderTipY + length;
  const endInnerX = endOuterX - endHalf * 2;
  const endInnerY = endOuterY + 4;

  return {
    out:
      `C${r1(shoulderX + 8)},${r1(shoulderTipY + 8)} ${r1(endOuterX + 2)},${r1(endOuterY - length * 0.45)} ${r1(endOuterX)},${r1(endOuterY)}` +
      ` L${r1(endInnerX)},${r1(endInnerY)}` +
      ` C${r1(endInnerX - 4)},${r1(endInnerY - length * 0.4)} ${r1(CX + torso.chestHalf + 5)},${r1(armpitY + 8)} ${r1(CX + torso.chestHalf)},${r1(armpitY)}`,
    armpitY,
  };
}

function sideAndHem(spec: GarmentSpec, armpitY: number): string {
  const { torso } = spec;
  const waistY = armpitY + (torso.hemY - armpitY) * 0.55;
  const chestX = CX + torso.chestHalf;
  const waistX = CX + torso.waistHalf;
  const hemX = CX + torso.hemHalf;
  const hemStyle = torso.hemStyle ?? 'straight';

  // Spread the waist->hem control points proportionally to how much the
  // garment flares, otherwise a big sweep (anarkali, A-line dress) kinks
  // into a hard corner at the waist instead of falling away smoothly.
  const flare = hemX - waistX;
  const drop = torso.hemY - waistY;
  const side =
    `C${r1(chestX + 1)},${r1(armpitY + 18)} ${r1(waistX)},${r1(waistY - 14)} ${r1(waistX)},${r1(waistY)}` +
    ` C${r1(waistX + flare * 0.12)},${r1(waistY + drop * 0.34)} ${r1(hemX - flare * 0.3)},${r1(torso.hemY - drop * 0.3)} ${r1(hemX)},${r1(torso.hemY)}`;

  let hem: string;
  if (hemStyle === 'curved') {
    hem = ` Q${r1(CX)},${r1(torso.hemY + 10)} ${r1(mirrorX(hemX))},${r1(torso.hemY)}`;
  } else if (hemStyle === 'asymmetric') {
    hem = ` Q${r1(CX + 14)},${r1(torso.hemY + 14)} ${r1(CX)},${r1(torso.hemY + 6)} Q${r1(CX - 18)},${r1(torso.hemY - 3)} ${r1(mirrorX(hemX))},${r1(torso.hemY)}`;
  } else {
    hem = ` L${r1(mirrorX(hemX))},${r1(torso.hemY)}`;
  }
  return side + hem;
}

/** Mirror a right-hand path segment string by rebuilding it for the left. */
function buildFace(spec: GarmentSpec, face: 'front' | 'back'): string {
  const { shoulder } = spec;
  const neckLeftX = CX - spec.neck.halfWidth;
  const shoulderTipY = shoulder.y + shoulder.slope;
  const { out, armpitY } = sleeveOutline(spec);

  // Right half, top-down, then the hem carries us to the left edge and we
  // retrace the mirror image upward.
  const right =
    `M${r1(neckLeftX)},${r1(shoulder.y)} ` +
    necklinePath(spec, face) +
    ` L${r1(CX + shoulder.halfWidth)},${r1(shoulderTipY)} ` +
    out +
    ' ' +
    sideAndHem(spec, armpitY);

  // Left half mirrors the right, traversed upward back to the neck.
  const mirrored = mirrorSegments(spec, armpitY, face);
  return `${right} ${mirrored} Z`;
}

function mirrorSegments(spec: GarmentSpec, armpitY: number, _face: 'front' | 'back'): string {
  const { shoulder, torso, sleeve } = spec;
  const waistY = armpitY + (torso.hemY - armpitY) * 0.55;
  const chestX = mirrorX(CX + torso.chestHalf);
  const waistX = mirrorX(CX + torso.waistHalf);
  const hemX = mirrorX(CX + torso.hemHalf);
  const shoulderX = mirrorX(CX + shoulder.halfWidth);
  const shoulderTipY = shoulder.y + shoulder.slope;

  const flare = waistX - hemX; // negative-x mirror of the right-hand flare
  const drop = torso.hemY - waistY;
  const upSide =
    `C${r1(hemX - flare * 0.3)},${r1(torso.hemY - drop * 0.3)} ${r1(waistX - flare * 0.12)},${r1(waistY + drop * 0.34)} ${r1(waistX)},${r1(waistY)}` +
    ` C${r1(waistX)},${r1(waistY - 14)} ${r1(chestX - 1)},${r1(armpitY + 18)} ${r1(chestX)},${r1(armpitY)}`;

  if (sleeve.kind === 'none') {
    return `${upSide} Q${r1(shoulderX - 2)},${r1(shoulderTipY + 20)} ${r1(shoulderX)},${r1(shoulderTipY)}`;
  }

  const lengths: Record<Exclude<SleeveKind, 'none'>, number> = { cap: 18, short: 46, threequarter: 92, long: 128 };
  const length = lengths[sleeve.kind];
  const taper = sleeve.taper ?? 0.72;
  const endHalf = sleeve.endHalfWidth ?? 17 * taper;
  const spread = sleeve.kind === 'long' ? 10 : 14;
  const endOuterX = mirrorX(CX + shoulder.halfWidth + spread);
  const endOuterY = shoulderTipY + length;
  const endInnerX = endOuterX + endHalf * 2;
  const endInnerY = endOuterY + 4;

  return (
    `${upSide}` +
    ` C${r1(CX - torso.chestHalf - 5)},${r1(armpitY + 8)} ${r1(endInnerX + 4)},${r1(endInnerY - length * 0.4)} ${r1(endInnerX)},${r1(endInnerY)}` +
    ` L${r1(endOuterX)},${r1(endOuterY)}` +
    ` C${r1(endOuterX - 2)},${r1(endOuterY - length * 0.45)} ${r1(shoulderX - 8)},${r1(shoulderTipY + 8)} ${r1(shoulderX)},${r1(shoulderTipY)}`
  );
}

function collarPanels(spec: GarmentSpec, face: 'front' | 'back'): string[] {
  const { neck, shoulder } = spec;
  const top = shoulder.y;
  const hw = neck.halfWidth;
  const depth = face === 'front' ? neck.depth : neck.backDepth ?? neck.depth * 0.4;

  switch (neck.style) {
    case 'mandarin':
      return [
        `M${r1(CX - hw - 2)},${r1(top + 1)} Q${r1(CX)},${r1(top + depth + 5)} ${r1(CX + hw + 2)},${r1(top + 1)} ` +
          `L${r1(CX + hw + 2)},${r1(top - 9)} Q${r1(CX)},${r1(top - 4)} ${r1(CX - hw - 2)},${r1(top - 9)} Z`,
      ];
    case 'polo':
    case 'collar': {
      const spreadX = hw + 14;
      const pointY = top + depth + 16;
      return [
        `M${r1(CX - hw)},${r1(top)} L${r1(CX - spreadX)},${r1(top + 6)} L${r1(CX - 5)},${r1(pointY)} L${r1(CX)},${r1(top + depth)} Z`,
        `M${r1(CX + hw)},${r1(top)} L${r1(CX + spreadX)},${r1(top + 6)} L${r1(CX + 5)},${r1(pointY)} L${r1(CX)},${r1(top + depth)} Z`,
      ];
    }
    case 'hood':
      // Only the two front edges of the hood that frame the neck opening;
      // the bulk of the hood is drawn behind the body (see hoodBehind).
      return [
        `M${r1(CX - hw - 10)},${r1(top + 2)} C${r1(CX - hw - 8)},${r1(top + depth + 12)} ${r1(CX - hw * 0.3)},${r1(top + depth + 16)} ${r1(CX)},${r1(top + depth + 6)} ` +
          `L${r1(CX)},${r1(top + depth)} C${r1(CX - hw * 0.4)},${r1(top + depth + 8)} ${r1(CX - hw)},${r1(top + depth + 2)} ${r1(CX - hw)},${r1(top)} Z`,
        `M${r1(CX + hw + 10)},${r1(top + 2)} C${r1(CX + hw + 8)},${r1(top + depth + 12)} ${r1(CX + hw * 0.3)},${r1(top + depth + 16)} ${r1(CX)},${r1(top + depth + 6)} ` +
          `L${r1(CX)},${r1(top + depth)} C${r1(CX + hw * 0.4)},${r1(top + depth + 8)} ${r1(CX + hw)},${r1(top + depth + 2)} ${r1(CX + hw)},${r1(top)} Z`,
      ];
    default:
      // Ribbed crew/scoop/v band, offset just inside the neckline.
      return [];
  }
}

function buildSeams(spec: GarmentSpec, face: 'front' | 'back'): string[] {
  const { shoulder, sleeve, torso, neck } = spec;
  const seams: string[] = [];
  const shoulderTipY = shoulder.y + shoulder.slope;
  const armpitY = shoulder.y + 46;

  // Neckline topstitch, sitting a few units inside the raw edge.
  const depth = face === 'front' ? neck.depth : neck.backDepth ?? neck.depth * 0.4;
  if (neck.style === 'crew' || neck.style === 'scoop' || neck.style === 'boat') {
    const hw = neck.halfWidth - 3.5;
    const d = depth - 3.5;
    seams.push(
      `M${r1(CX - hw)},${r1(shoulder.y + 3)} C${r1(CX - hw * 0.75)},${r1(shoulder.y + d)} ${r1(CX + hw * 0.75)},${r1(shoulder.y + d)} ${r1(CX + hw)},${r1(shoulder.y + 3)}`,
    );
  }

  // Armhole seams.
  if (sleeve.kind !== 'none') {
    seams.push(
      `M${r1(CX + shoulder.halfWidth - 2)},${r1(shoulderTipY + 2)} Q${r1(CX + torso.chestHalf + 6)},${r1(armpitY - 16)} ${r1(CX + torso.chestHalf - 1)},${r1(armpitY - 1)}`,
    );
    seams.push(
      `M${r1(mirrorX(CX + shoulder.halfWidth - 2))},${r1(shoulderTipY + 2)} Q${r1(mirrorX(CX + torso.chestHalf + 6))},${r1(armpitY - 16)} ${r1(mirrorX(CX + torso.chestHalf - 1))},${r1(armpitY - 1)}`,
    );
  }

  // Hem topstitch.
  const hemX = CX + torso.hemHalf;
  seams.push(`M${r1(mirrorX(hemX) + 3)},${r1(torso.hemY - 6)} L${r1(hemX - 3)},${r1(torso.hemY - 6)}`);

  // Side slits (kurta/kurti).
  if (torso.sideSlit) {
    const slitTop = torso.hemY - (torso.hemY - armpitY) * torso.sideSlit;
    seams.push(`M${r1(hemX - 1)},${r1(slitTop)} L${r1(hemX - 1)},${r1(torso.hemY - 2)}`);
    seams.push(`M${r1(mirrorX(hemX - 1))},${r1(slitTop)} L${r1(mirrorX(hemX - 1))},${r1(torso.hemY - 2)}`);
  }

  // Front placket.
  if (spec.placket && face === 'front') {
    const toY = spec.placket.toY ?? torso.hemY;
    seams.push(`M${r1(CX - spec.placket.width / 2)},${r1(shoulder.y + depth)} L${r1(CX - spec.placket.width / 2)},${r1(toY)}`);
    seams.push(`M${r1(CX + spec.placket.width / 2)},${r1(shoulder.y + depth)} L${r1(CX + spec.placket.width / 2)},${r1(toY)}`);
  }

  // Cuff lines.
  if (sleeve.kind !== 'none' && spec.ribbed) {
    const lengths: Record<Exclude<SleeveKind, 'none'>, number> = { cap: 18, short: 46, threequarter: 92, long: 128 };
    const endY = shoulderTipY + lengths[sleeve.kind] - 7;
    const outer = CX + shoulder.halfWidth + (sleeve.kind === 'long' ? 10 : 14);
    const endHalf = spec.sleeve.endHalfWidth ?? 17 * (spec.sleeve.taper ?? 0.72);
    seams.push(`M${r1(outer)},${r1(endY)} L${r1(outer - endHalf * 2)},${r1(endY + 4)}`);
    seams.push(`M${r1(mirrorX(outer))},${r1(endY)} L${r1(mirrorX(outer - endHalf * 2))},${r1(endY + 4)}`);
  }

  return seams;
}

function buildFolds(spec: GarmentSpec): string[] {
  const { torso, shoulder } = spec;
  const armpitY = shoulder.y + 46;
  const bodyLen = torso.hemY - armpitY;
  const leftX = CX - torso.waistHalf;
  const rightX = CX + torso.waistHalf;

  // Soft drape lines: a couple near each side seam, one under the chest.
  return [
    `M${r1(leftX + 10)},${r1(armpitY + bodyLen * 0.18)} Q${r1(leftX + 16)},${r1(armpitY + bodyLen * 0.5)} ${r1(leftX + 9)},${r1(torso.hemY - 10)}`,
    `M${r1(rightX - 10)},${r1(armpitY + bodyLen * 0.2)} Q${r1(rightX - 17)},${r1(armpitY + bodyLen * 0.52)} ${r1(rightX - 8)},${r1(torso.hemY - 12)}`,
    `M${r1(CX - 22)},${r1(armpitY + bodyLen * 0.66)} Q${r1(CX)},${r1(armpitY + bodyLen * 0.74)} ${r1(CX + 22)},${r1(armpitY + bodyLen * 0.64)}`,
  ];
}

function buildButtons(spec: GarmentSpec): { x: number; y: number; r: number }[] {
  if (!spec.placket) return [];
  const { buttons, toY } = spec.placket;
  const startY = spec.shoulder.y + spec.neck.depth + 10;
  const endY = (toY ?? spec.torso.hemY) - 10;
  const step = buttons > 1 ? (endY - startY) / (buttons - 1) : 0;
  return Array.from({ length: buttons }, (_, i) => ({ x: CX, y: r1(startY + step * i), r: 2.1 }));
}

/**
 * Escape hatch for garments that aren't a torso + sleeves — bags, caps,
 * skirts. These supply their own outline instead of being generated.
 */
export interface CustomGarment {
  body: string;
  behind?: string[];
  seams?: string[];
  folds?: string[];
  panels?: string[];
  buttons?: { x: number; y: number; r: number }[];
  backBody?: string;
}

/**
 * The bulk of a hood: a wide, flattened dome sitting behind the shoulders.
 * Drawn before the body so the shoulder line crosses in front of it, which
 * is what makes it read as fabric bunched behind the neck rather than a
 * balloon stuck on top.
 */
function hoodBehind(spec: GarmentSpec): string[] {
  if (spec.neck.style !== 'hood' && !spec.hood) return [];
  const top = spec.shoulder.y;
  const halfWidth = Math.min(spec.shoulder.halfWidth * 0.82, 42);
  const rise = 30;
  return [
    `M${r1(CX - halfWidth)},${r1(top + 18)} ` +
      `C${r1(CX - halfWidth - 3)},${r1(top - rise * 0.55)} ${r1(CX - halfWidth * 0.45)},${r1(top - rise)} ${r1(CX)},${r1(top - rise)} ` +
      `C${r1(CX + halfWidth * 0.45)},${r1(top - rise)} ${r1(CX + halfWidth + 3)},${r1(top - rise * 0.55)} ${r1(CX + halfWidth)},${r1(top + 18)} ` +
      `C${r1(CX + halfWidth * 0.5)},${r1(top + 26)} ${r1(CX - halfWidth * 0.5)},${r1(top + 26)} ${r1(CX - halfWidth)},${r1(top + 18)} Z`,
  ];
}

export function buildGarmentArt(spec: GarmentSpec, face: 'front' | 'back'): GarmentArt {
  return {
    body: buildFace(spec, face),
    behind: hoodBehind(spec),
    seams: buildSeams(spec, face),
    folds: buildFolds(spec),
    panels: collarPanels(spec, face),
    buttons: face === 'front' ? buildButtons(spec) : [],
  };
}

export function customGarmentArt(custom: CustomGarment, face: 'front' | 'back'): GarmentArt {
  return {
    body: (face === 'back' && custom.backBody) || custom.body,
    behind: custom.behind ?? [],
    seams: custom.seams ?? [],
    folds: custom.folds ?? [],
    panels: custom.panels ?? [],
    buttons: face === 'front' ? custom.buttons ?? [] : [],
  };
}
