"""Razorpay integration.

Two rules this module exists to enforce:

1. The amount charged is computed on the server from the design's own price.
   The browser never sends an amount, so it can't be tampered with.
2. An order only becomes CONFIRMED after a signature computed with the
   secret key matches what the gateway sent. The client "payment succeeded"
   callback is treated as a hint to re-check, never as proof.
"""

import hashlib
import hmac
import logging

from django.conf import settings
from django.utils import timezone

from threadloom.money import to_minor_units, CURRENCY_CODE

logger = logging.getLogger(__name__)


class PaymentError(RuntimeError):
    pass


class PaymentNotConfigured(PaymentError):
    """Razorpay keys are absent — checkout is unavailable, but the rest of
    the app must keep working (local dev, CI, browsing the catalogue)."""


def is_configured() -> bool:
    return bool(settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET)


def _client():
    if not is_configured():
        raise PaymentNotConfigured('Razorpay keys are not configured on this deployment.')
    import razorpay

    return razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))


def create_gateway_order(order) -> str:
    """Register the order with Razorpay and return its order id."""
    client = _client()
    receipt = f'threadloom-{order.pk}'
    gateway_order = client.order.create({
        'amount': to_minor_units(order.total_price),
        'currency': CURRENCY_CODE,
        'receipt': receipt,
        'notes': {
            'order_id': str(order.pk),
            'design_id': str(order.design_id),
        },
    })
    return gateway_order['id']


def _expected_signature(payload: str) -> str:
    return hmac.new(
        settings.RAZORPAY_KEY_SECRET.encode('utf-8'),
        payload.encode('utf-8'),
        hashlib.sha256,
    ).hexdigest()


def verify_checkout_signature(razorpay_order_id: str, razorpay_payment_id: str, signature: str) -> bool:
    """Checkout handback: HMAC over "<order_id>|<payment_id>"."""
    if not is_configured():
        return False
    expected = _expected_signature(f'{razorpay_order_id}|{razorpay_payment_id}')
    return hmac.compare_digest(expected, signature or '')


def verify_webhook_signature(raw_body: bytes, signature: str) -> bool:
    """Webhook: HMAC over the raw request body, keyed by the webhook secret
    (which is separate from the API secret)."""
    secret = settings.RAZORPAY_WEBHOOK_SECRET
    if not secret:
        return False
    expected = hmac.new(secret.encode('utf-8'), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature or '')


def mark_paid(order, payment_id: str, signature: str = '') -> bool:
    """Move an order to CONFIRMED. Idempotent — the checkout callback and the
    webhook both land here and whichever arrives second is a no-op."""
    if order.is_paid:
        return False

    order.razorpay_payment_id = payment_id
    order.razorpay_signature = signature
    order.paid_at = timezone.now()
    order.status = order.Status.CONFIRMED
    order.save(update_fields=['razorpay_payment_id', 'razorpay_signature', 'paid_at', 'status'])
    logger.info('Order %s confirmed via payment %s', order.pk, payment_id)
    return True


def mark_failed(order, reason: str = '') -> None:
    if order.is_paid:
        return  # a later failure event must never un-confirm a paid order
    order.status = order.Status.PAYMENT_FAILED
    order.save(update_fields=['status'])
    logger.warning('Order %s payment failed: %s', order.pk, reason)
