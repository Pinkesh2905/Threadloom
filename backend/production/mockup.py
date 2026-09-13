"""Server-side flat-sketch mockup for a design's tech pack — pure Pillow
drawing over the same viewBox coordinate space the frontend's print zones
live in, so zone rectangles and any baked text line up correctly. This is
a technical diagram (like a real tech pack's flat sketch), not a photoreal
render.
"""

from PIL import Image, ImageDraw, ImageFont

VIEWBOX_WIDTH = 200
VIEWBOX_HEIGHT = 220
SCALE = 4  # render at 4x for crisper PDF embedding

# Straight-line approximation of the frontend's tee silhouette path
# (frontend/src/lib/garmentSvgs.ts TEE_BODY) — a flat technical sketch
# doesn't need the curve fidelity a live preview does.
TEE_OUTLINE = [
    (100, 14), (90, 16), (82, 20), (78, 26), (60, 14), (20, 54), (52, 72),
    (52, 200), (148, 200), (148, 72), (180, 54), (140, 14), (122, 26),
    (118, 20), (110, 16),
]

HOOD_OUTLINE = [
    (66, 26), (66, 6), (100, -8), (134, 6), (134, 26), (124, 27),
    (112, 31), (105, 20), (95, 20), (88, 31), (76, 27),
]


def _hex_to_rgb(hex_color: str) -> tuple:
    hex_color = (hex_color or '#FFFFFF').lstrip('#')
    if len(hex_color) != 6:
        return (255, 255, 255)
    return tuple(int(hex_color[i:i + 2], 16) for i in (0, 2, 4))


def render_garment_mockup(svg_key: str, base_color: str, print_zones, layers: list) -> Image.Image:
    """Returns a flat technical sketch: silhouette in the chosen color, each
    print zone outlined, and any text layers drawn in place. Image layers are
    shown as a labeled placeholder box (rendering the actual uploaded artwork
    would mean fetching it from storage, out of scope for a spec-sheet)."""
    w, h = VIEWBOX_WIDTH * SCALE, VIEWBOX_HEIGHT * SCALE
    img = Image.new('RGB', (w, h), (255, 255, 255))
    draw = ImageDraw.Draw(img)

    color = _hex_to_rgb(base_color)
    scaled_outline = [(x * SCALE, y * SCALE) for x, y in TEE_OUTLINE]
    draw.polygon(scaled_outline, fill=color, outline=(80, 80, 80), width=2)

    if svg_key == 'hoodie':
        scaled_hood = [(x * SCALE, max(0, y) * SCALE) for x, y in HOOD_OUTLINE]
        draw.polygon(scaled_hood, fill=color, outline=(80, 80, 80), width=2)

    try:
        font = ImageFont.truetype('arial.ttf', 11 * SCALE)
        small_font = ImageFont.truetype('arial.ttf', 6 * SCALE)
    except OSError:
        font = ImageFont.load_default()
        small_font = font

    zones_by_key = {z.key: z for z in print_zones}

    for zone in print_zones:
        x0, y0 = zone.x * SCALE, zone.y * SCALE
        x1, y1 = (zone.x + zone.width) * SCALE, (zone.y + zone.height) * SCALE
        draw.rectangle([x0, y0, x1, y1], outline=(180, 60, 20), width=1)

    for layer in layers:
        zone = zones_by_key.get(layer.get('zone'))
        if not zone:
            continue
        cx = (zone.x + zone.width * (layer.get('x', 50) / 100)) * SCALE
        cy = (zone.y + zone.height * (layer.get('y', 50) / 100)) * SCALE

        if layer.get('type') == 'text':
            text = str(layer.get('text', ''))[:24]
            text_color = _hex_to_rgb(layer.get('color', '#141414'))
            bbox = draw.textbbox((0, 0), text, font=font)
            tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
            draw.text((cx - tw / 2, cy - th / 2), text, fill=text_color, font=font)
        else:
            box_w, box_h = 28 * SCALE, 28 * SCALE
            box = [cx - box_w / 2, cy - box_h / 2, cx + box_w / 2, cy + box_h / 2]
            draw.rectangle(box, outline=(120, 120, 120), width=2)
            draw.line([box[0], box[1], box[2], box[3]], fill=(120, 120, 120), width=1)
            draw.line([box[0], box[3], box[2], box[1]], fill=(120, 120, 120), width=1)
            draw.text((cx, cy + box_h / 2 + 4), 'IMAGE', fill=(120, 120, 120), font=small_font, anchor='mt')

    return img
