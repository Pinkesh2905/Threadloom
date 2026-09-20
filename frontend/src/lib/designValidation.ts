/**
 * Pre-flight checks that run before an order can be placed.
 *
 * The canvas already refuses out-of-bounds moves, but a design can still
 * become invalid without being dragged — a font size bumped up, a curve
 * widened, a garment swapped underneath it. This is the gate that catches
 * that, so nothing unprintable reaches production.
 */

import { GARMENT_VIEWBOX } from './garmentArt';
import { getPrintPolygon, polygonWidthAt, rectFitsInPolygon, type Polygon } from './printZones';
import { getDesignFont } from './designFonts';
import { measureTextWidth } from './textMetrics';
import type { DesignLayer } from '@/types/designer';

export interface LayerIssue {
  layerId: string;
  zone: string;
  label: string;
  message: string;
  kind: 'out-of-bounds' | 'too-wide' | 'low-contrast';
}

const IMAGE_BASE_UNITS = GARMENT_VIEWBOX.width * 0.25;

/** Measure once at a reference size, then scale — viewBox units, not px. */
const MEASURE_REFERENCE_PX = 100;

function textWidthInViewBoxUnits(
  text: string,
  sizeInUnits: number,
  fontFamily: string,
  fontWeight: string | number,
): number {
  if (!text) return 0;
  const atReference = measureTextWidth(text, MEASURE_REFERENCE_PX, fontFamily, fontWeight);
  return (atReference / MEASURE_REFERENCE_PX) * sizeInUnits;
}
const POCKET_BASE_UNITS = 44;

export function describeLayer(layer: DesignLayer): string {
  if (layer.type === 'text') return `“${layer.text || 'Text'}”`;
  if (layer.type === 'pocket') return `${layer.pocketStyle ?? 'patch'} pocket`;
  return 'Uploaded image';
}

/**
 * Approximate on-garment size of a layer in viewBox units. Text width is
 * estimated from glyph count — exact metrics need a canvas, and this runs
 * on data that may not be rendered.
 */
export function estimateLayerBox(layer: DesignLayer): { width: number; height: number } {
  if (layer.type === 'text') {
    const size = (layer.fontSize ?? 11) * layer.scale;
    // Measured with the same canvas metrics Konva uses, so this gate and
    // the canvas agree on whether a string fits. A character-count
    // heuristic disagreed with the canvas and flagged valid designs.
    const font = getDesignFont(layer.fontFamily);
    const width = textWidthInViewBoxUnits(layer.text || '', size, font.family, font.weight ?? 'normal');
    // Curving bends the run inward horizontally and taller vertically.
    const curveFactor = layer.curve ? Math.max(0.55, 1 - Math.abs(layer.curve) / 260) : 1;
    return {
      width: width * curveFactor,
      height: size * (layer.curve ? 1.9 : 1.25),
    };
  }
  if (layer.type === 'pocket') {
    const size = POCKET_BASE_UNITS * layer.scale * 0.5;
    return { width: size, height: size * 1.1 };
  }
  const width = IMAGE_BASE_UNITS * layer.scale;
  const aspect = layer.width && layer.height ? layer.width / layer.height : 1;
  return { width, height: width / aspect };
}

function layerRect(layer: DesignLayer) {
  const { width, height } = estimateLayerBox(layer);
  return {
    x: (layer.x / 100) * GARMENT_VIEWBOX.width - width / 2,
    y: (layer.y / 100) * GARMENT_VIEWBOX.height - height / 2,
    width,
    height,
    rotation: layer.rotation,
  };
}

/** Largest font size that still fits this layer's text inside the zone. */
export function maxFontSizeFor(layer: DesignLayer, polygon: Polygon): number {
  const y = (layer.y / 100) * GARMENT_VIEWBOX.height;
  const available = polygonWidthAt(polygon, y);
  if (available <= 0) return 8;

  const font = getDesignFont(layer.fontFamily);
  // Width at one unit of font size, so the cap is a straight division.
  const widthPerUnit =
    textWidthInViewBoxUnits(layer.text || '', 1, font.family, font.weight ?? 'normal') *
    Math.max(layer.scale, 0.01) *
    (layer.curve ? Math.max(0.55, 1 - Math.abs(layer.curve) / 260) : 1);

  if (widthPerUnit <= 0) return 40;
  return Math.max(4, Math.floor(available / widthPerUnit));
}

/** WCAG relative luminance, used to spot invisible tonal prints. */
function luminance(hex: string): number {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const [r, g, b] = [0, 2, 4].map((i) => {
    const channel = parseInt(full.slice(i, i + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  try {
    const la = luminance(a);
    const lb = luminance(b);
    const [hi, lo] = la > lb ? [la, lb] : [lb, la];
    return (hi + 0.05) / (lo + 0.05);
  } catch {
    return 21;
  }
}

/** Below this a print is effectively invisible on the garment. */
export const MIN_CONTRAST = 1.6;

export function validateDesign(
  layers: DesignLayer[],
  svgKey: string,
  garmentColor: string,
  zoneLabels: Record<string, string> = {},
): LayerIssue[] {
  const issues: LayerIssue[] = [];

  for (const layer of layers) {
    const face: 'front' | 'back' = layer.zone === 'back' ? 'back' : 'front';
    const polygon = getPrintPolygon(svgKey, face);
    const zoneLabel = zoneLabels[layer.zone] ?? layer.zone;

    if (!rectFitsInPolygon(layerRect(layer), polygon)) {
      issues.push({
        layerId: layer.id,
        zone: layer.zone,
        label: describeLayer(layer),
        kind: 'out-of-bounds',
        message: `${describeLayer(layer)} falls outside the printable area on the ${zoneLabel}.`,
      });
      continue; // one blocking issue per layer is enough to act on
    }

    if (layer.type === 'text') {
      const maxSize = maxFontSizeFor(layer, polygon);
      if ((layer.fontSize ?? 11) > maxSize) {
        issues.push({
          layerId: layer.id,
          zone: layer.zone,
          label: describeLayer(layer),
          kind: 'too-wide',
          message: `${describeLayer(layer)} is too wide for the ${zoneLabel} — shorten the text or reduce the size.`,
        });
      }
    }

    if (layer.type !== 'pocket' && layer.color) {
      if (contrastRatio(layer.color, garmentColor) < MIN_CONTRAST) {
        issues.push({
          layerId: layer.id,
          zone: layer.zone,
          label: describeLayer(layer),
          kind: 'low-contrast',
          message: `${describeLayer(layer)} barely contrasts with the garment colour — it may be nearly invisible.`,
        });
      }
    }
  }

  return issues;
}

/** Low contrast is a warning you can accept; the rest blocks the order. */
export const isBlocking = (issue: LayerIssue) => issue.kind !== 'low-contrast';
