from django.db import models
from django.conf import settings
from designer.models import Design


class Order(models.Model):
    class Size(models.TextChoices):
        XS = 'XS', 'XS'
        S = 'S', 'S'
        M = 'M', 'M'
        L = 'L', 'L'
        XL = 'XL', 'XL'
        XXL = 'XXL', 'XXL'

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        IN_PRODUCTION = 'in_production', 'In Production'
        SHIPPED = 'shipped', 'Shipped'
        DELIVERED = 'delivered', 'Delivered'
        CANCELLED = 'cancelled', 'Cancelled'

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='orders')
    design = models.ForeignKey(Design, on_delete=models.PROTECT, related_name='orders')
    size = models.CharField(max_length=3, choices=Size.choices, default=Size.M)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=8, decimal_places=2)
    total_price = models.DecimalField(max_digits=8, decimal_places=2)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)

    # A snapshot of the chosen address's fields at order time — not a live FK,
    # so editing or deleting a saved address never rewrites a past order.
    shipping_name = models.CharField(max_length=150, blank=True, default='')
    shipping_line1 = models.CharField(max_length=200, blank=True, default='')
    shipping_line2 = models.CharField(max_length=200, blank=True, default='')
    shipping_city = models.CharField(max_length=100, blank=True, default='')
    shipping_state = models.CharField(max_length=100, blank=True, default='')
    shipping_postal_code = models.CharField(max_length=20, blank=True, default='')
    shipping_country = models.CharField(max_length=100, blank=True, default='')
    shipping_phone = models.CharField(max_length=30, blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Order #{self.pk} ({self.user.email})'
