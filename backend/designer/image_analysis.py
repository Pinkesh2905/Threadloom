"""Classical, deterministic artwork analysis — k-means color clustering and
raster-to-vector tracing. No generative/ML-chat model involved anywhere."""

import numpy as np
from PIL import Image


def analyze_artwork_colors(image: Image.Image, max_clusters: int = 8):
    """Cluster the artwork's opaque pixels with k-means and use the number
    of *significant* clusters (>=2% of pixels) to suggest a print method —
    the same tiering a real screen-print shop quotes by: flat 1-color,
    multi-color spot separation, or full-color DTG for photographic art."""
    from sklearn.cluster import KMeans

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

    kmeans = KMeans(n_clusters=k, n_init=4, random_state=42).fit(opaque)
    centers = kmeans.cluster_centers_.astype(int)
    counts = np.bincount(kmeans.labels_)
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
