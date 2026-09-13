import io
from celery import shared_task
from django.core.files.base import ContentFile
from PIL import Image

# Pinned explicitly: rembg's *default* model (as of 2.0.x) is BRIA RMBG-2.0,
# a ~1GB download. u2net is a much lighter (~176MB), well-proven general
# background-remover — the same one Wearlo already uses — so we ask for it
# by name instead of silently pulling a multi-gigabyte default on first use.
# The session is built once per worker process and reused across calls.
_rembg_session = None


def _get_rembg_session():
    global _rembg_session
    if _rembg_session is None:
        import rembg
        _rembg_session = rembg.new_session('u2net')
    return _rembg_session


@shared_task
def remove_background_task(asset_id: int):
    """Cleans up uploaded artwork with three classical, self-hosted steps —
    none of them a generative/chat AI call:

    1. rembg — local background removal.
    2. scikit-learn k-means — dominant-color clustering, used to suggest a
       print method the same way a screen-print shop would quote it.
    3. vtracer — raster-to-vector tracing, for a crisp scalable version.
    """
    from designer.models import UploadedAsset
    from designer.image_analysis import analyze_artwork_colors, vectorize_png_bytes
    import rembg

    asset = UploadedAsset.objects.get(pk=asset_id)

    with asset.original_image.open('rb') as f:
        original_bytes = f.read()

    output_bytes = rembg.remove(original_bytes, session=_get_rembg_session())
    image = Image.open(io.BytesIO(output_bytes)).convert('RGBA')

    buffer = io.BytesIO()
    image.save(buffer, format='PNG')
    cleaned_bytes = buffer.getvalue()
    asset.processed_image.save(
        f'{asset.pk}_cleaned.png',
        ContentFile(cleaned_bytes),
        save=False,
    )
    asset.width, asset.height = image.size

    dominant_colors, suggested_print_method = analyze_artwork_colors(image)
    asset.dominant_colors = dominant_colors
    asset.suggested_print_method = suggested_print_method

    try:
        svg_string = vectorize_png_bytes(cleaned_bytes)
        asset.vector_image.save(
            f'{asset.pk}_vector.svg',
            ContentFile(svg_string.encode('utf-8')),
            save=False,
        )
    except Exception:
        pass  # vectorization is a bonus, not required for the layer to work

    asset.save(update_fields=[
        'processed_image', 'vector_image', 'width', 'height',
        'dominant_colors', 'suggested_print_method',
    ])
    return asset.pk
