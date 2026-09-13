import uuid

from django.db import models
from django.conf import settings
from catalog.models import GarmentType


def _generate_share_token():
    return uuid.uuid4().hex[:12]


class Design(models.Model):
    """A customer's in-progress or saved garment design: a chosen garment
    type, its selected style options, a base color, and a list of layers
    (text/image) placed into the garment's print zones."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='designs')
    garment_type = models.ForeignKey(GarmentType, on_delete=models.PROTECT, related_name='designs')
    name = models.CharField(max_length=100, blank=True, default='')
    base_color = models.CharField(max_length=7, default='#FFFFFF')
    selected_options = models.JSONField(default=dict, blank=True)
    layers = models.JSONField(default=list, blank=True)
    price = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    is_public = models.BooleanField(default=False, help_text='Shown in the public template gallery for others to clone.')
    # An unlisted link anyone with the URL can use to view (not edit) this
    # design, independent of the public-gallery listing flag above.
    share_token = models.CharField(max_length=32, unique=True, default=_generate_share_token, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return self.name or f'{self.garment_type.name} design #{self.pk}'


class UploadedAsset(models.Model):
    """A user-uploaded image (logo/artwork) after local background-removal
    cleanup, ready to be referenced by a design layer's imageUrl."""

    class PrintMethod(models.TextChoices):
        ONE_COLOR = 'one_color', '1-Color Screen Print'
        SPOT_COLOR = 'spot_color', 'Multi-Color Screen Print'
        FULL_COLOR = 'full_color', 'Full-Color DTG'

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='uploaded_assets')
    original_image = models.ImageField(upload_to='designer/originals/')
    processed_image = models.ImageField(upload_to='designer/processed/', blank=True, null=True)
    vector_image = models.FileField(upload_to='designer/vectors/', blank=True, null=True)
    width = models.PositiveIntegerField(null=True, blank=True)
    height = models.PositiveIntegerField(null=True, blank=True)
    dominant_colors = models.JSONField(default=list, blank=True, help_text='Hex colors from k-means clustering of the artwork.')
    suggested_print_method = models.CharField(max_length=20, choices=PrintMethod.choices, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'Asset #{self.pk} ({self.user.email})'
