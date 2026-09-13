"""Production-ticket QR codes — deterministic encoding of an order tracking
reference, generated locally with the `qrcode` library."""

import io
import qrcode


def generate_order_qr_png(order_id: int, base_url: str) -> bytes:
    payload = f'{base_url}/orders/{order_id}'
    img = qrcode.make(payload, box_size=8, border=2)
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    return buffer.getvalue()
