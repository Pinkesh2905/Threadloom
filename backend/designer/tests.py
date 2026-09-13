from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory
from rest_framework.request import Request
from catalog.models import GarmentType, GarmentStyleOption
from .pricing import compute_price
from .throttling import DesignSaveThrottle

User = get_user_model()


class PricingTests(TestCase):
    def setUp(self):
        self.tee = GarmentType.objects.create(
            name='Test Tee', slug='test-tee', svg_key='tee', base_price=Decimal('18.00'),
        )
        GarmentStyleOption.objects.create(
            garment_type=self.tee, category='fit', category_label='Fit',
            key='slim', label='Slim', price_delta=Decimal('2.00'),
        )

    def test_base_price_with_no_layers(self):
        price = compute_price(self.tee, {}, [])
        self.assertEqual(price, Decimal('18.00'))

    def test_adds_style_option_delta(self):
        price = compute_price(self.tee, {'fit': 'slim'}, [])
        self.assertEqual(price, Decimal('20.00'))

    def test_zone_setup_fee_charged_once_per_zone_not_per_layer(self):
        layers = [
            {'zone': 'front', 'type': 'text'},
            {'zone': 'front', 'type': 'text'},
        ]
        price = compute_price(self.tee, {}, layers)
        # base 18 + one zone fee (5) + two text-layer fees (2 each) = 27
        self.assertEqual(price, Decimal('27.00'))

    def test_two_zones_charged_separately(self):
        layers = [
            {'zone': 'front', 'type': 'text'},
            {'zone': 'back', 'type': 'image'},
        ]
        price = compute_price(self.tee, {}, layers)
        # base 18 + two zone fees (10) + text fee (2) + image fee (4) = 34
        self.assertEqual(price, Decimal('34.00'))

    def test_unknown_option_is_ignored(self):
        price = compute_price(self.tee, {'fit': 'does-not-exist'}, [])
        self.assertEqual(price, Decimal('18.00'))


class DesignSaveThrottleTests(TestCase):
    def test_blocks_once_the_configured_rate_is_exceeded(self):
        user = User.objects.create_user(email='throttle@example.com', password='pw12345678')
        throttle = DesignSaveThrottle()
        # Bypass the settings lookup and drive the same rate-limiting logic
        # with a tiny, test-only rate so the test doesn't need 31 requests.
        throttle.num_requests, throttle.duration = 2, 60

        request = Request(APIRequestFactory().post('/api/designer/designs/'))
        request.user = user

        allowed = [throttle.allow_request(request, view=None) for _ in range(3)]
        self.assertEqual(allowed, [True, True, False])
