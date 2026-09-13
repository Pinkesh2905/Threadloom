/**
 * Hand-drawn flat-lay silhouette paths, keyed by GarmentType.svg_key and
 * shared viewBox "0 0 200 220" — the same coordinate space the backend's
 * PrintZone x/y/width/height live in, so a zone rectangle always lines up
 * with the garment drawn underneath it. Pure vector art: recoloring is a
 * plain `fill` swap, no photo/pixel color math needed.
 */

const TEE_BODY =
  'M100,14 C90,14 82,20 78,26 L60,14 L20,54 L52,72 L52,200 L148,200 L148,72 L180,54 L140,14 L122,26 C118,20 110,14 100,14 Z';

const TEE_BODY_BACK =
  'M100,14 L82,20 L60,14 L20,54 L52,72 L52,200 L148,200 L148,72 L180,54 L140,14 L118,20 Z';

const HOOD_OVERLAY =
  'M66,26 C66,2 134,2 134,26 C134,34 124,27 112,31 C105,20 95,20 88,31 C76,27 66,34 66,26 Z';

const HOOD_DRAWSTRINGS = 'M96,31 L94,52 M104,31 L106,52';

export interface GarmentSvg {
  front: string;
  back: string;
  /** Extra decorative overlay drawn on top of the front body (e.g. a hood). */
  frontOverlay?: string;
  /** Overlay drawn with stroke only, no fill (e.g. drawstrings). */
  frontStrokeOverlay?: string;
}

export const GARMENT_VIEWBOX = { width: 200, height: 220 };

export const GARMENT_SVGS: Record<string, GarmentSvg> = {
  tee: {
    front: TEE_BODY,
    back: TEE_BODY_BACK,
  },
  hoodie: {
    front: TEE_BODY,
    back: TEE_BODY_BACK,
    frontOverlay: HOOD_OVERLAY,
    frontStrokeOverlay: HOOD_DRAWSTRINGS,
  },
};

export function getGarmentSvg(svgKey: string): GarmentSvg {
  return GARMENT_SVGS[svgKey] ?? GARMENT_SVGS.tee;
}
