import io

from celery import shared_task
from django.core.files.base import ContentFile


@shared_task
def remove_background_task(asset_id: int):
    """Cleans up uploaded artwork with three classical, self-hosted steps —
    none of them a generative/chat AI call:

    1. OpenCV — background removal by border flood-fill (flat backgrounds)
       or GrabCut (photos).
    2. scikit-learn k-means — dominant-color clustering, used to suggest a
       print method the same way a screen-print shop would quote it.
    3. vtracer — raster-to-vector tracing, for a crisp scalable version.

    This runs inline in the request on deployments without a Celery worker
    (CELERY_ALWAYS_EAGER), so every step is deliberately bounded in both
    working resolution and iteration count — see designer.image_analysis.
    """
    from PIL import Image

    from designer.models import UploadedAsset
    from designer.image_analysis import analyze_artwork_colors, remove_background, vectorize_png_bytes

    asset = UploadedAsset.objects.get(pk=asset_id)

    with asset.original_image.open('rb') as f:
        original_bytes = f.read()

    image = remove_background(Image.open(io.BytesIO(original_bytes)))

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
