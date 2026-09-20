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
        # Nothing reaches production until a payment is verified server-side,
        # so a newly created order starts here and can only leave via the
        # payment-verification path (see orders.payments).
        PENDING_PAYMENT = 'pending_payment', 'Awaiting Payment'
        CONFIRMED = 'confirmed', 'Confirmed'
        IN_PRODUCTION = 'in_production', 'In Production'
        SHIPPED = 'shipped', 'Shipped'
        DELIVERED = 'delivered', 'Delivered'
        CANCELLED = 'cancelled', 'Cancelled'
        PAYMENT_FAILED = 'payment_failed', 'Payment Failed'

    #: Statuses staff may set by hand. Payment states are deliberately not
    #: in here — only a verified gateway signature moves an order into them.
    STAFF_SETTABLE_STATUSES = (
        Status.IN_PRODUCTION,
        Status.SHIPPED,
        Status.DELIVERED,
        Status.CANCELLED,
    )

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='orders')
    design = models.ForeignKey(Design, on_delete=models.PROTECT, related_name='orders')
    size = models.CharField(max_length=3, choices=Size.choices, default=Size.M)
    quantity = models.PositiveIntegerField(default=1)

    # Money. Every component is stored rather than recomputed, so an invoice
    # reprints identically even if rates or the design's price change later.
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    gst_rate = models.DecimalField(max_digits=4, decimal_places=3, default=0)
    gst_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    shipping_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING_PAYMENT)

    # Razorpay. The order id is handed to the browser; the payment id and
    # signature only ever get written after server-side verification.
    razorpay_order_id = models.CharField(max_length=64, blank=True, default='', db_index=True)
    razorpay_payment_id = models.CharField(max_length=64, blank=True, default='')
    razorpay_signature = models.CharField(max_length=256, blank=True, default='')
    paid_at = models.DateTimeField(null=True, blank=True)

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

    @property
    def is_paid(self):
        return self.paid_at is not None

    @property
    def has_shipping_address(self):
        return bool(self.shipping_name and self.shipping_line1 and self.shipping_city and self.shipping_postal_code)
