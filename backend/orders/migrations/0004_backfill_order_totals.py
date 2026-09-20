"""Backfill money columns and retire the old 'pending' status.

Orders created before checkout existed have a total_price that was just
unit_price * quantity, with no tax or shipping, and sit in a 'pending'
status that no longer exists. They were never paid for, so they move to
'pending_payment' and get a proper breakdown recomputed from their stored
unit price.
"""

from django.db import migrations


def backfill(apps, schema_editor):
    Order = apps.get_model('orders', 'Order')
    from threadloom.money import build_totals

    for order in Order.objects.all().iterator():
        totals = build_totals(order.unit_price, order.quantity)
        order.subtotal = totals['subtotal']
        order.gst_rate = totals['gst_rate']
        order.gst_amount = totals['gst_amount']
        order.shipping_amount = totals['shipping_amount']
        order.total_price = totals['total_price']
        if order.status == 'pending':
            order.status = 'pending_payment'
        order.save(update_fields=[
            'subtotal', 'gst_rate', 'gst_amount', 'shipping_amount', 'total_price', 'status',
        ])


def unbackfill(apps, schema_editor):
    Order = apps.get_model('orders', 'Order')
    for order in Order.objects.all().iterator():
        order.total_price = order.subtotal or order.total_price
        if order.status == 'pending_payment':
            order.status = 'pending'
        order.save(update_fields=['total_price', 'status'])


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0003_order_gst_amount_order_gst_rate_order_paid_at_and_more'),
    ]

    operations = [
        migrations.RunPython(backfill, unbackfill),
    ]
