"""Single source of truth for currency and tax.

Anything that formats or computes money — pricing engine, order totals,
tech-pack PDFs, the frontend mirror in lib/currency.ts — reads its numbers
from here so a rate or symbol never has to be changed in three places.
"""

from decimal import Decimal, ROUND_HALF_UP

CURRENCY_CODE = 'INR'
CURRENCY_SYMBOL = '₹'
# Razorpay (like most gateways) transacts in the minor unit.
MINOR_UNITS_PER_RUPEE = 100

# Printed/stitched apparel sits in the 5% slab below this per-piece
# threshold and 12% above it, so the rate depends on the garment price.
GST_LOW_RATE = Decimal('0.05')
GST_HIGH_RATE = Decimal('0.12')
GST_RATE_THRESHOLD = Decimal('1000.00')

SHIPPING_FLAT = Decimal('79.00')
FREE_SHIPPING_ABOVE = Decimal('1499.00')

TWO_PLACES = Decimal('0.01')


def quantize(amount: Decimal) -> Decimal:
    return Decimal(amount).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)


def gst_rate_for(unit_price: Decimal) -> Decimal:
    """GST slab is decided per piece, not on the order total."""
    return GST_HIGH_RATE if Decimal(unit_price) > GST_RATE_THRESHOLD else GST_LOW_RATE


def shipping_for(subtotal: Decimal) -> Decimal:
    return Decimal('0.00') if Decimal(subtotal) >= FREE_SHIPPING_ABOVE else SHIPPING_FLAT


def build_totals(unit_price: Decimal, quantity: int) -> dict:
    """The one place an order total is assembled. Returns every component so
    the customer sees a breakdown rather than a single opaque number."""
    unit_price = Decimal(unit_price)
    subtotal = quantize(unit_price * quantity)
    rate = gst_rate_for(unit_price)
    gst_amount = quantize(subtotal * rate)
    shipping = shipping_for(subtotal)
    return {
        'subtotal': subtotal,
        'gst_rate': rate,
        'gst_amount': gst_amount,
        'shipping_amount': shipping,
        'total_price': quantize(subtotal + gst_amount + shipping),
    }


def to_minor_units(amount: Decimal) -> int:
    """Rupees -> paise, for the payment gateway."""
    return int((quantize(amount) * MINOR_UNITS_PER_RUPEE).to_integral_value(rounding=ROUND_HALF_UP))
