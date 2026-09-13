"""Text-layer -> embroidery machine file (.dst), built from classical
computer vision, not a licensed digitizing engine or an AI model:

  1. Render the text to a bitmap with Pillow, at high resolution.
  2. Trace its stroke outlines with OpenCV contour detection.
  3. Resample each contour into a running-stitch point path and write it
     with pyembroidery.

This gives a genuine, sewable running-stitch outline of the text — the
same class of technique real hobbyist auto-digitizers use for simple
single-color designs. It is not full satin/fill digitizing (that needs a
human digitizer's judgment calls), so it's offered only for text layers.
"""

import io
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFont
import pyembroidery

# 1 raw SVG-viewBox unit (the space DesignLayer.fontSize/scale live in) is
# treated as this many real-world millimeters on the finished garment.
MM_PER_RAW_UNIT = 2.0
RENDER_SCALE = 4
CONTOUR_SAMPLE_STEP = 3
MAX_STITCHES = 15_000


class EmbroideryError(ValueError):
    pass


def _load_font(size_px: int):
    try:
        return ImageFont.truetype('arial.ttf', size_px)
    except OSError:
        return ImageFont.load_default()


def text_layer_to_dst(text: str, font_size_raw: float, layer_scale: float) -> bytes:
    text = (text or '').strip()
    if not text:
        raise EmbroideryError('This layer has no text to digitize.')

    font_px = max(12, int(font_size_raw * layer_scale * RENDER_SCALE))
    font = _load_font(font_px)

    probe = Image.new('L', (4, 4))
    bbox = ImageDraw.Draw(probe).textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    if tw <= 0 or th <= 0:
        raise EmbroideryError('This layer has no visible strokes to digitize.')

    pad = 12
    canvas = Image.new('L', (tw + pad * 2, th + pad * 2), 0)
    ImageDraw.Draw(canvas).text((pad - bbox[0], pad - bbox[1]), text, fill=255, font=font)

    contours, _ = cv2.findContours(np.array(canvas), cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        raise EmbroideryError('Could not trace any strokes for this text.')

    # font_px pixels tall corresponds to (font_size_raw * layer_scale) raw
    # units tall, and each raw unit is MM_PER_RAW_UNIT mm -> this gives the
    # px-to-0.1mm (pyembroidery's native unit) conversion factor.
    px_to_tenth_mm = (font_size_raw * layer_scale * MM_PER_RAW_UNIT * 10) / font_px

    pattern = pyembroidery.EmbPattern()
    pattern.add_thread(pyembroidery.EmbThread(20, 20, 20))

    stitch_count = 0
    first_block = True
    for contour in contours:
        points = contour.reshape(-1, 2)
        if len(points) < 3:
            continue
        sampled = points[::CONTOUR_SAMPLE_STEP] if len(points) > CONTOUR_SAMPLE_STEP else points

        if stitch_count + len(sampled) > MAX_STITCHES:
            raise EmbroideryError('This text is too complex to digitize as one design — try shorter text.')

        if not first_block:
            pattern.trim()
        first_block = False

        for x, y in sampled:
            pattern.stitch_abs(float(x) * px_to_tenth_mm, float(y) * px_to_tenth_mm)
            stitch_count += 1

    pattern.end()
    buffer = io.BytesIO()
    pyembroidery.write_dst(pattern, buffer)
    return buffer.getvalue()
