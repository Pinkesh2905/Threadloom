import hashlib

from celery import shared_task
from django.core.files.base import ContentFile


def _embroidery_content_hash(text: str, font_size_raw: float, layer_scale: float) -> str:
    raw = f'{text}|{font_size_raw}|{layer_scale}'
    return hashlib.sha256(raw.encode('utf-8')).hexdigest()


@shared_task
def generate_tech_pack_task(order_id: int, base_url: str):
    """Renders and caches a tech-pack PDF for an order. Safe to call
    whenever the artifact might be missing or stale — overwrites any
    existing file for this order."""
    from orders.models import Order
    from .models import TechPackArtifact
    from .pdf import generate_tech_pack

    order = Order.objects.select_related('design__garment_type', 'user').get(pk=order_id)
    pdf_bytes = generate_tech_pack(order, base_url)

    artifact, _ = TechPackArtifact.objects.get_or_create(order=order)
    artifact.file.save(f'order-{order.id}-tech-pack.pdf', ContentFile(pdf_bytes), save=True)
    return artifact.pk


@shared_task
def generate_embroidery_task(design_id: int, layer_id: str, text: str, font_size_raw: float, layer_scale: float):
    """Renders and caches a .dst embroidery file for one text layer."""
    from designer.models import Design
    from .models import EmbroideryArtifact
    from .embroidery import text_layer_to_dst

    design = Design.objects.get(pk=design_id)
    dst_bytes = text_layer_to_dst(text, font_size_raw, layer_scale)
    content_hash = _embroidery_content_hash(text, font_size_raw, layer_scale)

    artifact, _ = EmbroideryArtifact.objects.update_or_create(
        design=design, layer_id=layer_id,
        defaults={'content_hash': content_hash},
    )
    artifact.file.save(f'design-{design_id}-{layer_id}.dst', ContentFile(dst_bytes), save=True)
    return artifact.pk
