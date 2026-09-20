/**
 * True ink bounds for text.
 *
 * Konva `Text` nodes here carry an explicit layout `width` (most of the
 * stage) purely so `align: center` has something to centre within. Both
 * getClientRect() and getSelfRect() report that layout box, so a two-letter
 * string measures ~320px instead of ~19px. Anything that tests text against
 * the printable area has to use the glyph extent instead, or every position
 * fails — including the one the layer is already sitting at.
 */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  /** Rotation pivot. Defaults to the rect's own centre. */
  originX?: number;
  originY?: number;
}

export type TextAlign = 'left' | 'center' | 'right';

export interface TextBoxProps {
  /** Node position, before `offset` is applied. */
  x: number;
  y: number;
  /** Configured layout width — the thing that misleads getClientRect. */
  width: number;
  offsetX: number;
  offsetY: number;
  /** Measured glyph extent. */
  textWidth: number;
  textHeight: number;
  align: TextAlign;
  rotation?: number;
}

/**
 * Where the glyphs actually sit inside the layout box. Pure, so the clamp
 * logic can be tested without a canvas or a live Konva stage.
 */
export function inkBoundsFromTextBox(props: TextBoxProps): Rect {
  const boxLeft = props.x - props.offsetX;
  const slack = props.width - props.textWidth;

  let inkLeft: number;
  if (props.align === 'center') inkLeft = boxLeft + slack / 2;
  else if (props.align === 'right') inkLeft = boxLeft + slack;
  else inkLeft = boxLeft;

  return {
    x: inkLeft,
    y: props.y - props.offsetY,
    width: props.textWidth,
    height: props.textHeight,
    rotation: props.rotation ?? 0,
    // Konva rotates about the node's position, not the ink centre — which
    // differ for left/right alignment.
    originX: props.x,
    originY: props.y,
  };
}

// ---------------------------------------------------------------- measuring

let ctx: CanvasRenderingContext2D | null | undefined;

function measurementContext(): CanvasRenderingContext2D | null {
  if (ctx !== undefined) return ctx;
  if (typeof document === 'undefined') {
    ctx = null;
    return ctx;
  }
  ctx = document.createElement('canvas').getContext('2d');
  return ctx;
}

/** Rough fallback when there's no canvas (SSR, tests without a DOM). */
const AVERAGE_GLYPH_RATIO = 0.58;

const cache = new Map<string, number>();

/**
 * Glyph width in px. Uses the same canvas text metrics Konva itself does,
 * so validation and the canvas agree on whether something fits.
 */
export function measureTextWidth(
  text: string,
  fontSizePx: number,
  fontFamily = 'sans-serif',
  fontWeight: string | number = 'normal',
): number {
  if (!text) return 0;

  const key = `${fontWeight}|${fontSizePx}|${fontFamily}|${text}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;

  const context = measurementContext();
  let width: number;
  if (context) {
    context.font = `${fontWeight} ${fontSizePx}px ${fontFamily}`;
    width = context.measureText(text).width;
  } else {
    width = text.length * fontSizePx * AVERAGE_GLYPH_RATIO;
  }

  cache.set(key, width);
  return width;
}
