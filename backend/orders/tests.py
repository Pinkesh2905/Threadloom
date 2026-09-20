from decimal import Decimal
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from catalog.models import GarmentType, PrintZone
from designer.models import Design
from django.utils import timezone

from .models import Order
from production.models import TechPackArtifact, OrderStatusChange

User = get_user_model()


class OrderTechPackCachingTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email='order-tp@example.com', password='pw12345678')
        self.staff = User.objects.create_user(email='order-staff@example.com', password='pw12345678', is_staff=True)
        self.garment = GarmentType.objects.create(
            name='Test Tee', slug='otp-test-tee', svg_key='tee', base_price=Decimal('18.00'),
        )
        PrintZone.objects.create(
            garment_type=self.garment, key='front', label='Front', x=0, y=0, width=100, height=100,
        )
        self.design = Design.objects.create(
            user=self.user, garment_type=self.garment, base_color='#141414', layers=[], price=Decimal('18.00'),
        )
        # Paid, because fulfilment statuses are only reachable once money
        # has been verified — see Order.STAFF_SETTABLE_STATUSES.
        self.order = Order.objects.create(
            user=self.user, design=self.design, size='M', quantity=1,
            unit_price=Decimal('699.00'), subtotal=Decimal('699.00'),
            gst_rate=Decimal('0.05'), gst_amount=Decimal('34.95'),
            shipping_amount=Decimal('79.00'), total_price=Decimal('812.95'),
            status=Order.Status.CONFIRMED, paid_at=timezone.now(),
            razorpay_payment_id='pay_test_123',
        )

    def test_tech_pack_download_caches_a_single_artifact(self):
        self.client.force_authenticate(self.user)
        r1 = self.client.get(f'/api/orders/{self.order.id}/tech-pack/')
        self.assertEqual(r1.status_code, 200)
        r2 = self.client.get(f'/api/orders/{self.order.id}/tech-pack/')
        self.assertEqual(r2.status_code, 200)
        self.assertEqual(TechPackArtifact.objects.filter(order=self.order).count(), 1)

    def test_status_change_invalidates_cached_tech_pack_and_is_audited(self):
        self.client.force_authenticate(self.user)
        self.client.get(f'/api/orders/{self.order.id}/tech-pack/')
        self.assertEqual(TechPackArtifact.objects.filter(order=self.order).count(), 1)

        self.client.force_authenticate(self.staff)
        response = self.client.post(f'/api/orders/{self.order.id}/set-status/', {'status': 'in_production'}, format='json')
        self.assertEqual(response.status_code, 200)

        self.assertEqual(TechPackArtifact.objects.filter(order=self.order).count(), 0)
        change = OrderStatusChange.objects.get(order=self.order)
        self.assertEqual(change.from_status, 'confirmed')
        self.assertEqual(change.to_status, 'in_production')
        self.assertEqual(change.changed_by, self.staff)

    def test_setting_the_same_status_does_not_record_a_change(self):
        self.order.status = Order.Status.SHIPPED
        self.order.save(update_fields=['status'])
        self.client.force_authenticate(self.staff)
        response = self.client.post(f'/api/orders/{self.order.id}/set-status/', {'status': 'shipped'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(OrderStatusChange.objects.filter(order=self.order).count(), 0)

    def test_unpaid_orders_cannot_be_pushed_into_production(self):
        self.order.paid_at = None
        self.order.status = Order.Status.PENDING_PAYMENT
        self.order.save(update_fields=['paid_at', 'status'])
        self.client.force_authenticate(self.staff)
        response = self.client.post(
            f'/api/orders/{self.order.id}/set-status/', {'status': 'in_production'}, format='json',
        )
        self.assertEqual(response.status_code, 400)

    def test_payment_states_cannot_be_set_by_hand(self):
        self.client.force_authenticate(self.staff)
        response = self.client.post(
            f'/api/orders/{self.order.id}/set-status/', {'status': 'confirmed'}, format='json',
        )
        self.assertEqual(response.status_code, 400)

    def test_status_history_endpoint_lists_changes(self):
        self.client.force_authenticate(self.staff)
        self.client.post(f'/api/orders/{self.order.id}/set-status/', {'status': 'shipped'}, format='json')
        response = self.client.get(f'/api/orders/{self.order.id}/status-history/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['to_status'], 'shipped')
        self.assertEqual(response.data[0]['from_status'], 'confirmed')

    def test_owner_cannot_change_status(self):
        self.client.force_authenticate(self.user)
        response = self.client.post(f'/api/orders/{self.order.id}/set-status/', {'status': 'shipped'}, format='json')
        self.assertEqual(response.status_code, 403)


class OrderCreationRulesTests(APITestCase):
    """An order must be shippable and must start unpaid."""

    def setUp(self):
        self.user = User.objects.create_user(email='rules@example.com', password='pw12345678')
        self.garment = GarmentType.objects.create(
            name='Rules Tee', slug='rules-tee', svg_key='tee', base_price=Decimal('699.00'),
        )
        self.design = Design.objects.create(
            user=self.user, garment_type=self.garment, base_color='#141414',
            layers=[], price=Decimal('699.00'),
        )
        self.client.force_authenticate(self.user)

    def _address(self, **overrides):
        from accounts.models import Address
        fields = dict(
            user=self.user, full_name='A Customer', line1='12 Loom Street',
            city='Pune', postal_code='411001', country='India',
        )
        fields.update(overrides)
        return Address.objects.create(**fields)

    def test_order_without_an_address_is_rejected(self):
        response = self.client.post(
            '/api/orders/', {'design': self.design.id, 'size': 'M', 'quantity': 1}, format='json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('address_id', response.data)

    def test_incomplete_address_is_rejected(self):
        address = self._address(city='')
        response = self.client.post(
            '/api/orders/',
            {'design': self.design.id, 'size': 'M', 'quantity': 1, 'address_id': address.id},
            format='json',
        )
        self.assertEqual(response.status_code, 400)

    def test_another_users_address_is_rejected(self):
        stranger = User.objects.create_user(email='stranger@example.com', password='pw12345678')
        from accounts.models import Address
        theirs = Address.objects.create(
            user=stranger, full_name='Someone Else', line1='9 Other Road',
            city='Delhi', postal_code='110001',
        )
        response = self.client.post(
            '/api/orders/',
            {'design': self.design.id, 'size': 'M', 'quantity': 1, 'address_id': theirs.id},
            format='json',
        )
        self.assertEqual(response.status_code, 400)

    def test_order_starts_unpaid_with_a_server_computed_total(self):
        address = self._address()
        response = self.client.post(
            '/api/orders/',
            # A client-supplied total must be ignored, not trusted.
            {'design': self.design.id, 'size': 'M', 'quantity': 2,
             'address_id': address.id, 'total_price': '1.00'},
            format='json',
        )
        self.assertEqual(response.status_code, 201)
        order = Order.objects.get(pk=response.data['id'])
        self.assertEqual(order.status, Order.Status.PENDING_PAYMENT)
        self.assertIsNone(order.paid_at)
        # 699 x 2 = 1398 subtotal; 5% GST because the *unit* price is under
        # the slab threshold; shipping still charged as the subtotal is
        # under the free-shipping threshold.
        self.assertEqual(order.subtotal, Decimal('1398.00'))
        self.assertEqual(order.gst_amount, Decimal('69.90'))
        self.assertEqual(order.shipping_amount, Decimal('79.00'))
        self.assertEqual(order.total_price, Decimal('1546.90'))
        self.assertEqual(order.shipping_name, 'A Customer')


class PaymentVerificationTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email='pay@example.com', password='pw12345678')
        self.garment = GarmentType.objects.create(
            name='Pay Tee', slug='pay-tee', svg_key='tee', base_price=Decimal('699.00'),
        )
        self.design = Design.objects.create(
            user=self.user, garment_type=self.garment, base_color='#141414',
            layers=[], price=Decimal('699.00'),
        )
        self.order = Order.objects.create(
            user=self.user, design=self.design, size='M', quantity=1,
            unit_price=Decimal('699.00'), subtotal=Decimal('699.00'),
            gst_rate=Decimal('0.05'), gst_amount=Decimal('34.95'),
            shipping_amount=Decimal('79.00'), total_price=Decimal('812.95'),
            razorpay_order_id='order_test_abc',
            shipping_name='A Customer', shipping_line1='12 Loom Street',
            shipping_city='Pune', shipping_postal_code='411001',
        )
        self.client.force_authenticate(self.user)

    def test_a_forged_signature_does_not_confirm_the_order(self):
        response = self.client.post(
            f'/api/orders/{self.order.id}/verify-payment/',
            {'razorpay_order_id': 'order_test_abc',
             'razorpay_payment_id': 'pay_fake',
             'razorpay_signature': 'not-a-real-signature'},
            format='json',
        )
        self.assertEqual(response.status_code, 400)
        self.order.refresh_from_db()
        self.assertIsNone(self.order.paid_at)
        self.assertNotEqual(self.order.status, Order.Status.CONFIRMED)

    def test_a_valid_signature_confirms_the_order(self):
        import hashlib
        import hmac
        from django.test import override_settings

        secret = 'test_secret_key'
        payment_id = 'pay_real_123'
        signature = hmac.new(
            secret.encode(), f'order_test_abc|{payment_id}'.encode(), hashlib.sha256,
        ).hexdigest()

        with override_settings(RAZORPAY_KEY_ID='rzp_test_x', RAZORPAY_KEY_SECRET=secret):
            response = self.client.post(
                f'/api/orders/{self.order.id}/verify-payment/',
                {'razorpay_order_id': 'order_test_abc',
                 'razorpay_payment_id': payment_id,
                 'razorpay_signature': signature},
                format='json',
            )

        self.assertEqual(response.status_code, 200)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, Order.Status.CONFIRMED)
        self.assertIsNotNone(self.order.paid_at)

    def test_webhook_without_a_valid_signature_is_refused(self):
        response = self.client.post(
            '/api/payments/razorpay/webhook/', {'event': 'payment.captured'}, format='json',
        )
        self.assertEqual(response.status_code, 400)
        self.order.refresh_from_db()
        self.assertIsNone(self.order.paid_at)
