from django.db import models


class GarmentType(models.Model):
    """A base garment a customer can design (e.g. Classic Tee, Pullover Hoodie).

    ``svg_key`` selects which hand-drawn flat-lay silhouette the frontend
    renders (see frontend/src/lib/garmentSvgs.ts) — geometry lives in the
    frontend since it's pure presentation, not data the backend needs to
    reason about.
    """

    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True, default='')
    svg_key = models.CharField(max_length=50)
    viewbox_width = models.PositiveIntegerField(default=200)
    viewbox_height = models.PositiveIntegerField(default=220)
    base_price = models.DecimalField(max_digits=8, decimal_places=2)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['sort_order', 'name']

    def __str__(self):
        return self.name


class PrintZone(models.Model):
    """A rectangular design area on a garment (front, back, ...), in the
    same viewBox coordinate space as the garment's SVG silhouette."""

    garment_type = models.ForeignKey(GarmentType, on_delete=models.CASCADE, related_name='print_zones')
    key = models.SlugField()
    label = models.CharField(max_length=50)
    x = models.FloatField()
    y = models.FloatField()
    width = models.FloatField()
    height = models.FloatField()
    dpi = models.PositiveIntegerField(default=300)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['sort_order', 'id']
        unique_together = ('garment_type', 'key')

    def __str__(self):
        return f'{self.garment_type.name} — {self.label}'


class GarmentStyleOption(models.Model):
    """A selectable style choice grouped by category (e.g. category='pocket',
    key='kangaroo'). ``price_delta`` is added to the base price when chosen."""

    garment_type = models.ForeignKey(GarmentType, on_delete=models.CASCADE, related_name='style_options')
    category = models.SlugField()
    category_label = models.CharField(max_length=50)
    key = models.SlugField()
    label = models.CharField(max_length=50)
    price_delta = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    is_default = models.BooleanField(default=False)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['category', 'sort_order', 'id']
        unique_together = ('garment_type', 'category', 'key')

    def __str__(self):
        return f'{self.garment_type.name} — {self.category}: {self.label}'
