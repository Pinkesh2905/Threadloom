/**
 * Regression tests for the text-bounds clamp.
 *
 * The bug: Konva `Text` nodes carry an explicit layout width so that
 * `align: center` has something to centre within, and getClientRect()
 * reports that box rather than the glyphs. Feeding it to the print-area
 * check measured a two-letter string as ~320px on a 340px stage, so no
 * position ever fitted — text became completely undraggable on every
 * garment, including at the position it was already sitting at.
 */

import { describe, expect, it } from 'vitest';

import { inkBoundsFromTextBox, type TextAlign } from '../textMetrics';
import { getPrintPolygon, rectFitsInPolygon, type Polygon, type Rect } from '../printZones';
import { GARMENT_VIEWBOX } from '../garmentArt';

/** The stage the studio actually renders at. */
const DISPLAY_WIDTH = 340;
const SCALE = DISPLAY_WIDTH / GARMENT_VIEWBOX.width;

/** Same layout width the canvas gives its Text nodes. */
const LAYOUT_WIDTH = GARMENT_VIEWBOX.width * SCALE * 0.94;

const polygonInPx = (svgKey: string, face: 'front' | 'back' = 'front'): Polygon =>
  getPrintPolygon(svgKey, face).map(([x, y]) => [x * SCALE, y * SCALE] as [number, number]);

/**
 * Stand-in for a centre-aligned Konva Text node at a given stage position.
 * `textWidth` is the measured glyph extent that getTextWidth() would return.
 */
function textNodeInk(opts: {
  centreX: number;
  centreY: number;
  textWidth: number;
  fontSize: number;
  align?: TextAlign;
  rotation?: number;
}): Rect {
  const align = opts.align ?? 'center';
  return inkBoundsFromTextBox({
    x: opts.centreX,
    y: opts.centreY,
    width: LAYOUT_WIDTH,
    offsetX: LAYOUT_WIDTH / 2,
    offsetY: opts.fontSize / 2,
    textWidth: opts.textWidth,
    textHeight: opts.fontSize,
    align,
    rotation: opts.rotation ?? 0,
  });
}

/** Mirrors dragBoundFunc: shift the ink box by the proposed delta. */
function dragWouldBeAccepted(ink: Rect, dx: number, dy: number, polygon: Polygon): boolean {
  return rectFitsInPolygon(
    {
      ...ink,
      x: ink.x + dx,
      y: ink.y + dy,
      originX: ink.originX === undefined ? undefined : ink.originX + dx,
      originY: ink.originY === undefined ? undefined : ink.originY + dy,
    },
    polygon,
  );
}

describe('inkBoundsFromTextBox', () => {
  // (3) The whole point: report glyph extent, not the layout box.
  it.each<TextAlign>(['center', 'left', 'right'])(
    'reports the measured glyph width for %s-aligned text',
    (align) => {
      const textWidth = 19;
      const ink = textNodeInk({ centreX: 170, centreY: 200, textWidth, fontSize: 19, align });
      expect(Math.abs(ink.width - textWidth)).toBeLessThanOrEqual(1);
    },
  );

  it('never reports the inflated layout width', () => {
    const ink = textNodeInk({ centreX: 170, centreY: 200, textWidth: 19, fontSize: 19 });
    expect(ink.width).toBeLessThan(LAYOUT_WIDTH / 2);
  });

  it('places the glyphs according to alignment inside the layout box', () => {
    const shared = { centreX: 170, centreY: 200, textWidth: 40, fontSize: 19 };
    const left = textNodeInk({ ...shared, align: 'left' });
    const centre = textNodeInk({ ...shared, align: 'center' });
    const right = textNodeInk({ ...shared, align: 'right' });

    expect(left.x).toBeLessThan(centre.x);
    expect(centre.x).toBeLessThan(right.x);
    // Centre-aligned ink straddles the node position.
    expect(centre.x + centre.width / 2).toBeCloseTo(shared.centreX, 5);
  });
});

describe('dragging text inside a print zone', () => {
  // (4) The invariant that would have caught the bug outright.
  it('never rejects a layer at the position it already occupies', () => {
    for (const svgKey of ['tee', 'lehenga', 'kurta', 'kurti', 'sherwani', 'dupatta']) {
      const polygon = polygonInPx(svgKey);
      const centreOfZone = polygon.reduce(
        (acc, [x, y]) => [acc[0] + x / polygon.length, acc[1] + y / polygon.length],
        [0, 0],
      );

      const ink = textNodeInk({
        centreX: centreOfZone[0],
        centreY: centreOfZone[1],
        textWidth: 19,
        fontSize: 19,
      });

      expect(rectFitsInPolygon(ink, polygon), `${svgKey}: layer rejected where it already sits`).toBe(true);
      expect(dragWouldBeAccepted(ink, 0, 0, polygon), `${svgKey}: zero-delta drag rejected`).toBe(true);
    }
  });

  // (1) A short string must move freely across the chest.
  it('lets a 2-character string travel the full width of the tee chest zone', () => {
    const polygon = polygonInPx('tee');
    const xs = polygon.map(([x]) => x);
    const ys = polygon.map(([, y]) => y);
    const midY = (Math.min(...ys) + Math.max(...ys)) / 2;

    const ink = textNodeInk({
      centreX: (Math.min(...xs) + Math.max(...xs)) / 2,
      centreY: midY,
      textWidth: 19, // "HI" at default size
      fontSize: 19,
    });

    // Sweep across the zone's width at its mid height; the interior must be
    // reachable rather than every position being refused.
    const span = Math.max(...xs) - Math.min(...xs);
    const accepted = [];
    for (let dx = -span / 2; dx <= span / 2; dx += span / 20) {
      if (dragWouldBeAccepted(ink, dx, 0, polygon)) accepted.push(dx);
    }

    expect(accepted.length).toBeGreaterThan(10);
    // And it can genuinely move sideways, not just sit still.
    expect(Math.max(...accepted) - Math.min(...accepted)).toBeGreaterThan(span / 3);
  });

  // (2) A near-full-width string is pinned horizontally but must still rise
  // and fall.
  it('still allows vertical movement for a string that nearly fills the zone', () => {
    const polygon = polygonInPx('tee');
    const xs = polygon.map(([x]) => x);
    const ys = polygon.map(([, y]) => y);
    const zoneWidth = Math.max(...xs) - Math.min(...xs);
    const midY = (Math.min(...ys) + Math.max(...ys)) / 2;

    const ink = textNodeInk({
      centreX: (Math.min(...xs) + Math.max(...xs)) / 2,
      centreY: midY,
      textWidth: zoneWidth * 0.82,
      fontSize: 19,
    });

    expect(rectFitsInPolygon(ink, polygon)).toBe(true);

    const movedUp = dragWouldBeAccepted(ink, 0, -8, polygon);
    const movedDown = dragWouldBeAccepted(ink, 0, 8, polygon);
    expect(movedUp || movedDown, 'a wide string could not move vertically at all').toBe(true);
  });

  it('still refuses a drag that would leave the garment', () => {
    const polygon = polygonInPx('tee');
    const xs = polygon.map(([x]) => x);
    const ys = polygon.map(([, y]) => y);
    const ink = textNodeInk({
      centreX: (Math.min(...xs) + Math.max(...xs)) / 2,
      centreY: (Math.min(...ys) + Math.max(...ys)) / 2,
      textWidth: 19,
      fontSize: 19,
    });

    // Far off to the side is still out of bounds — the fix must not have
    // simply disabled clamping.
    expect(dragWouldBeAccepted(ink, -500, 0, polygon)).toBe(false);
    expect(dragWouldBeAccepted(ink, 0, 600, polygon)).toBe(false);
  });
});
