"""Classical, deterministic artwork analysis — background removal, k-means
color clustering and raster-to-vector tracing. No generative/ML-chat model
involved anywhere."""

import cv2
import numpy as np
from PIL import Image

# Uploads are downscaled to this before any processing. Print output is
# generated from the vector trace, not this raster, so a bigger working
# image buys nothing but memory pressure and CPU time.
MAX_WORKING_EDGE = 1600
# Border colour spread below this reads as "flat studio background" and gets
# the cheap flood-fill path; above it we assume a photo and fall back to
# GrabCut.
FLAT_BACKGROUND_STD = 18.0
GRABCUT_EDGE = 512


def _downscale(image: Image.Image, max_edge: int = MAX_WORKING_EDGE) -> Image.Image:
    longest = max(image.size)
    if longest <= max_edge:
        return image
    ratio = max_edge / longest
    return image.resize((max(1, int(image.width * ratio)), max(1, int(image.height * ratio))), Image.LANCZOS)


def _border_spread(arr: np.ndarray) -> float:
    """How much the outermost ring of pixels varies — near zero for artwork
    sitting on a flat background, high for an edge-to-edge photo."""
    ring = np.concatenate([arr[0, :, :3], arr[-1, :, :3], arr[:, 0, :3], arr[:, -1, :3]], axis=0)
    return float(ring.std(axis=0).mean())


def _alpha_from_flood_fill(bgr: np.ndarray) -> np.ndarray:
    """Flood-fill inward from the edges. Unlike "delete every white pixel",
    this only removes background *connected to the border*, so the whites
    inside a logo (an eye, a counter in a letter) survive."""
    h, w = bgr.shape[:2]
    mask = np.zeros((h + 2, w + 2), np.uint8)
    tolerance = (16, 16, 16)
    flags = 4 | cv2.FLOODFILL_MASK_ONLY | (255 << 8)
    seeds = [
        (0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1),
        (w // 2, 0), (w // 2, h - 1), (0, h // 2), (w - 1, h // 2),
    ]
    scratch = bgr.copy()
    for seed in seeds:
        cv2.floodFill(scratch, mask, seed, 0, tolerance, tolerance, flags)
    background = mask[1:-1, 1:-1]
    return np.where(background > 0, 0, 255).astype(np.uint8)


def _alpha_from_grabcut(bgr: np.ndarray) -> np.ndarray:
    """Photographic fallback — segment a centred subject out of a busy
    background. Run on a downscaled copy and upscaled back, since GrabCut
    cost scales with pixel count and we only need a mask."""
    h, w = bgr.shape[:2]
    ratio = GRABCUT_EDGE / max(h, w) if max(h, w) > GRABCUT_EDGE else 1.0
    small = cv2.resize(bgr, None, fx=ratio, fy=ratio, interpolation=cv2.INTER_AREA) if ratio < 1.0 else bgr

    sh, sw = small.shape[:2]
    gc_mask = np.zeros((sh, sw), np.uint8)
    rect = (int(sw * 0.06), int(sh * 0.06), int(sw * 0.88), int(sh * 0.88))
    cv2.grabCut(small, gc_mask, rect, np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64), 3, cv2.GC_INIT_WITH_RECT)

    binary = np.where((gc_mask == cv2.GC_FGD) | (gc_mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    if ratio < 1.0:
        binary = cv2.resize(binary, (w, h), interpolation=cv2.INTER_LINEAR)
    return binary


def remove_background(image: Image.Image) -> Image.Image:
    """Knock the background out of uploaded artwork using ordinary computer
    vision — no segmentation model, nothing downloaded, nothing sent
    anywhere. Images that already carry real transparency are left alone."""
    working = _downscale(image).convert('RGBA')
    arr = np.array(working)

    already_cut_out = float((arr[:, :, 3] < 250).mean()) > 0.02
    if already_cut_out:
        return working

    bgr = cv2.cvtColor(arr[:, :, :3], cv2.COLOR_RGB2BGR)
    if _border_spread(arr) <= FLAT_BACKGROUND_STD:
        alpha = _alpha_from_flood_fill(bgr)
    else:
        alpha = _alpha_from_grabcut(bgr)

    # Soften the cut so edges don't stair-step once the art is scaled up on
    # a garment.
    alpha = cv2.GaussianBlur(alpha, (3, 3), 0)

    arr[:, :, 3] = alpha
    return Image.fromarray(arr, 'RGBA')


def analyze_artwork_colors(image: Image.Image, max_clusters: int = 8):
    """Cluster the artwork's opaque pixels with k-means and use the number
    of *significant* clusters (>=2% of pixels) to suggest a print method —
    the same tiering a real screen-print shop quotes by: flat 1-color,
    multi-color spot separation, or full-color DTG for photographic art.

    Uses OpenCV's k-means rather than scikit-learn's: identical algorithm,
    but it avoids pulling scikit-learn + scipy into the image just for this
    one call, and skips the multi-second sklearn import on the first upload
    after every process start.
    """
    rgba = np.array(image.convert('RGBA'))
    pixels = rgba.reshape(-1, 4)
    opaque = pixels[pixels[:, 3] > 10][:, :3]

    if len(opaque) == 0:
        return [], ''

    rng = np.random.default_rng(42)
    if len(opaque) > 20000:
        idx = rng.choice(len(opaque), 20000, replace=False)
        opaque = opaque[idx]

    unique_colors = len(np.unique(opaque, axis=0))
    k = max(1, min(max_clusters, unique_colors))

    cv2.setRNGSeed(42)  # same artwork must always quote the same print method
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 20, 1.0)
    _, labels, centers = cv2.kmeans(
        opaque.astype(np.float32), k, None, criteria, 4, cv2.KMEANS_PP_CENTERS,
    )
    centers = centers.astype(int)
    labels = labels.ravel()
    counts = np.bincount(labels, minlength=k)
    total = len(opaque)

    ranked = sorted(range(k), key=lambda i: -counts[i])
    significant = [i for i in ranked if counts[i] / total >= 0.02]

    hex_colors = ['#%02X%02X%02X' % tuple(centers[i]) for i in significant[:6]]

    n_significant = len(significant)
    if n_significant <= 1:
        method = 'one_color'
    elif n_significant <= 6:
        method = 'spot_color'
    else:
        method = 'full_color'

    return hex_colors, method


def vectorize_png_bytes(png_bytes: bytes) -> str:
    """Raster-to-vector trace via vtracer — turns a soft-edged bitmap logo
    into clean scalable paths, the same class of tool a print shop uses to
    prep artwork for large-format or embroidery output."""
    import vtracer

    return vtracer.convert_raw_image_to_svg(
        png_bytes,
        img_format='png',
        colormode='color',
        mode='spline',
    )
