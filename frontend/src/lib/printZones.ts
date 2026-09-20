/**
 * Printable areas as polygons that follow the garment, not rectangles.
 *
 * An axis-aligned rectangle overhangs anything that isn't a rectangle —
 * most visibly on a lehenga, where the widest part of the rectangle sits at
 * the narrowest part of the skirt, so artwork placed "inside the zone" hung
 * off both sides of the garment. Torso garments derive their polygon from
 * the same spec that draws them, so the area tapers and flares with the
 * silhouette automatically; non-torso shapes supply their own.
 *
 * All coordinates are in the shared 200x280 garment viewBox.
 */

import { GARMENT_VIEWBOX } from './garmentArt';
import { getGarmentSpec } from './garmentCatalog';
import type { Rect } from './textMetrics';

export type { Rect };

export type Point = [number, number];
export type Polygon = Point[];

/** Keep artwork this far inside the garment edge — seam allowance. */
const EDGE_INSET = 7;

/** Shapes that aren't a torso, so can't be derived from a garment spec. */
const CUSTOM_ZONES: Record<string, Polygon> = {
  // Flared skirt: narrow at the waistband, wide at the hem.
  lehenga: [
    [78, 96], [122, 96], [140, 150], [164, 236], [36, 236], [60, 150],
  ],
  // A flat draped panel — nearly the whole thing is printable.
  dupatta: [
    [52, 58], [148, 58], [160, 216], [40, 216],
  ],
  tote: [
    [50, 104], [150, 104], [156, 232], [44, 232],
  ],
  // Cap: only the front panel takes a print.
  cap: [
    [64, 104], [136, 104], [138, 144], [62, 144],
  ],
};

function torsoZone(svgKey: string, face: 'front' | 'back'): Polygon | null {
  const spec = getGarmentSpec(svgKey);
  if (!spec) return null;

  const { shoulder, torso, neck } = spec;
  const armpitY = shoulder.y + 46;
  // Start below the neckline/collar so artwork never lands on a seam.
  const top = Math.max(armpitY + 4, shoulder.y + neck.depth + 16);
  const bottom = torso.hemY - 12;
  const waistY = armpitY + (torso.hemY - armpitY) * 0.55;

  const halfAt = (half: number) => Math.max(8, half - EDGE_INSET);
  const cx = GARMENT_VIEWBOX.width / 2;

  const chest = halfAt(torso.chestHalf);
  const waist = halfAt(torso.waistHalf);
  const hem = halfAt(torso.hemHalf);

  // A front placket runs down the centre — keep the area off it by pulling
  // the top corners in, rather than printing across buttons.
  const plackedInset = spec.placket && face === 'front' ? spec.placket.width : 0;

  return [
    [cx - chest + plackedInset * 0.5, top],
    [cx + chest - plackedInset * 0.5, top],
    [cx + waist, waistY],
    [cx + hem, bottom],
    [cx - hem, bottom],
    [cx - waist, waistY],
  ];
}

const zoneCache = new Map<string, Polygon>();

export function getPrintPolygon(svgKey: string, face: 'front' | 'back'): Polygon {
  const cacheKey = `${svgKey}:${face}`;
  const cached = zoneCache.get(cacheKey);
  if (cached) return cached;

  const polygon = CUSTOM_ZONES[svgKey] ?? torsoZone(svgKey, face) ?? [
    [60, 100], [140, 100], [140, 200], [60, 200],
  ];
  zoneCache.set(cacheKey, polygon);
  return polygon;
}

/** Ray casting. Points exactly on an edge count as inside. */
export function pointInPolygon(point: Point, polygon: Polygon): boolean {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

/**
 * The four corners of a rect after rotation about its centre. Konva's
 * getClientRect() already returns an axis-aligned box *containing* the
 * rotated shape, which is too pessimistic for a diagonal layer, so rotate
 * the corners ourselves and test those.
 */
export function rectCorners(rect: Rect): Polygon {
  const { x, y, width, height } = rect;
  const rotation = ((rect.rotation ?? 0) * Math.PI) / 180;
  // Konva rotates about the node's own position, which only coincides with
  // the ink centre for centre-aligned text — so honour an explicit pivot.
  const cx = rect.originX ?? x + width / 2;
  const cy = rect.originY ?? y + height / 2;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);

  return ([
    [x, y],
    [x + width, y],
    [x + width, y + height],
    [x, y + height],
  ] as Polygon).map(([px, py]) => {
    const dx = px - cx;
    const dy = py - cy;
    return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos] as Point;
  });
}

/** Every corner inside the printable area. */
export function rectFitsInPolygon(rect: Rect, polygon: Polygon): boolean {
  return rectCorners(rect).every((corner) => pointInPolygon(corner, polygon));
}

/** Widest horizontal span of the polygon at a given height — used to cap
 *  text size to something the press can actually reach. */
export function polygonWidthAt(polygon: Polygon, y: number): number {
  const xs: number[] = [];
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (yi > y !== yj > y) {
      xs.push(((xj - xi) * (y - yi)) / (yj - yi) + xi);
    }
  }
  if (xs.length < 2) return 0;
  return Math.max(...xs) - Math.min(...xs);
}

export function polygonBounds(polygon: Polygon): Rect {
  const xs = polygon.map((p) => p[0]);
  const ys = polygon.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

export function polygonToSvgPoints(polygon: Polygon): string {
  return polygon.map(([x, y]) => `${x},${y}`).join(' ');
}
