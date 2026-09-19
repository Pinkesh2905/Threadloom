from decimal import Decimal
import numpy as np
from PIL import Image, ImageDraw
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory
from rest_framework.request import Request
from catalog.models import GarmentType, GarmentStyleOption
from .image_analysis import analyze_artwork_colors, remove_background
from .pricing import compute_price
from .throttling import DesignSaveThrottle

User = get_user_model()


def _logo_on_white(size=240):
    """A red ring with a white centre on a white field — the shape of the
    overwhelmingly common upload: flat artwork on a studio background."""
    image = Image.new('RGB', (size, size), 'white')
    draw = ImageDraw.Draw(image)
    draw.ellipse([size * 0.2, size * 0.2, size * 0.8, size * 0.8], fill=(200, 40, 40))
    draw.ellipse([size * 0.4, size * 0.4, size * 0.6, size * 0.6], fill='white')
    return image


class BackgroundRemovalTests(TestCase):
    def test_flat_background_is_cut_but_interior_whites_survive(self):
        alpha = np.array(remove_background(_logo_on_white()))[:, :, 3]
        size = alpha.shape[0]
        self.assertEqual(alpha[2, 2], 0, 'outside background should be transparent')
        self.assertEqual(alpha[size // 2, int(size * 0.3)], 255, 'the artwork itself should be opaque')
        # The white centre is enclosed by the ring, so it is part of the
        # design rather than background — naive "delete white" would eat it.
        self.assertEqual(alpha[size // 2, size // 2], 255, 'enclosed whites should survive')

    def test_existing_transparency_is_left_alone(self):
        image = Image.new('RGBA', (60, 60), (0, 0, 0, 0))
        ImageDraw.Draw(image).rectangle([20, 20, 40, 40], fill=(10, 10, 200, 255))
        result = np.array(remove_background(image))
        self.assertEqual(result[30, 30, 3], 255)
        self.assertEqual(result[2, 2, 3], 0)

    def test_oversized_uploads_are_downscaled(self):
        result = remove_background(Image.new('RGB', (4000, 3000), 'white'))
        self.assertLessEqual(max(result.size), 1600)


class ArtworkColorTests(TestCase):
    def test_is_deterministic_for_identical_input(self):
        art = remove_background(_logo_on_white())
        self.assertEqual(analyze_artwork_colors(art), analyze_artwork_colors(art))

    def test_flat_two_tone_art_quotes_as_spot_colour(self):
        _, method = analyze_artwork_colors(remove_background(_logo_on_white()))
        self.assertIn(method, ('one_color', 'spot_color'))

    def test_empty_artwork_returns_no_colours(self):
        self.assertEqual(analyze_artwork_colors(Image.new('RGBA', (40, 40), (0, 0, 0, 0))), ([], ''))


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
