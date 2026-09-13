from django.conf import settings
from django.db import models


class TechPackArtifact(models.Model):
    """A cached, previously-rendered tech-pack PDF for one order. Generated
    once by a Celery task and re-served from storage (S3 in production)
    instead of re-rendering reportlab/Pillow/rectpack on every download.

    Deleted (see orders.OrderViewSet.set_status) whenever the order's status
    changes, since the PDF prints that status on the page.
    """

    order = models.OneToOneField('orders.Order', on_delete=models.CASCADE, related_name='tech_pack_artifact')
    file = models.FileField(upload_to='production/tech-packs/')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'Tech pack for order #{self.order_id}'


class EmbroideryArtifact(models.Model):
    """A cached .dst digitization for one text layer of a design. Keyed on
    a content hash of the fields that affect the render (text, font size,
    layer scale) so an edited layer regenerates instead of serving a stale
    file under the same layer_id.
    """

    design = models.ForeignKey('designer.Design', on_delete=models.CASCADE, related_name='embroidery_artifacts')
    layer_id = models.CharField(max_length=64)
    content_hash = models.CharField(max_length=64)
    file = models.FileField(upload_to='production/embroidery/')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('design', 'layer_id')

    def __str__(self):
        return f'Embroidery file for design #{self.design_id} layer {self.layer_id}'


class OrderStatusChange(models.Model):
    """Audit trail entry for a staff-initiated order status change."""

    order = models.ForeignKey('orders.Order', on_delete=models.CASCADE, related_name='status_changes')
    changed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='+')
    from_status = models.CharField(max_length=20)
    to_status = models.CharField(max_length=20)
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-changed_at']

    def __str__(self):
        return f'Order #{self.order_id}: {self.from_status} -> {self.to_status}'
