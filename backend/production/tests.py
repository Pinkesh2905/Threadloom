from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from catalog.models import GarmentType, PrintZone
from designer.models import Design
from orders.models import Order
from .fabric import estimate_fabric_yield
from .tasks import generate_tech_pack_task, generate_embroidery_task, _embroidery_content_hash
from .models import TechPackArtifact, EmbroideryArtifact

User = get_user_model()


class FabricYieldTests(TestCase):
    def test_scales_with_quantity(self):
        one = estimate_fabric_yield('tee', 1)
        ten = estimate_fabric_yield('tee', 10)
        self.assertGreater(ten['fabric_length_cm'], one['fabric_length_cm'])
        self.assertEqual(ten['pieces_total'], 10 * one['pieces_total'])

    def test_unknown_garment_falls_back_to_tee_pieces(self):
        result = estimate_fabric_yield('unknown-key', 1)
        self.assertEqual(result['pieces_total'], 4)  # tee has 4 pattern pieces

    def test_utilization_is_a_sane_percentage(self):
        result = estimate_fabric_yield('hoodie', 5)
        self.assertGreater(result['utilization_pct'], 0)
        self.assertLessEqual(result['utilization_pct'], 100)
        self.assertAlmostEqual(result['utilization_pct'] + result['waste_pct'], 100, places=1)


class TechPackArtifactTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(email='techpack@example.com', password='pw12345678')
        self.garment = GarmentType.objects.create(
            name='Test Tee', slug='tp-test-tee', svg_key='tee', base_price=Decimal('18.00'),
        )
        PrintZone.objects.create(
            garment_type=self.garment, key='front', label='Front', x=0, y=0, width=100, height=100,
        )
        self.design = Design.objects.create(
            user=self.user, garment_type=self.garment, base_color='#141414',
            layers=[{'id': 'l1', 'zone': 'front', 'type': 'text', 'text': 'HELLO', 'color': '#FFFFFF', 'fontSize': 18}],
            price=Decimal('25.00'),
        )
        self.order = Order.objects.create(
            user=self.user, design=self.design, size='M', quantity=1,
            unit_price=Decimal('25.00'), total_price=Decimal('25.00'),
        )

    def test_generates_a_real_pdf_and_caches_it(self):
        generate_tech_pack_task(self.order.id, 'http://testserver')
        self.assertEqual(TechPackArtifact.objects.filter(order=self.order).count(), 1)
        artifact = TechPackArtifact.objects.get(order=self.order)
        with artifact.file.open('rb') as f:
            header = f.read(5)
        self.assertEqual(header, b'%PDF-')

    def test_regenerating_overwrites_rather_than_duplicating(self):
        generate_tech_pack_task(self.order.id, 'http://testserver')
        generate_tech_pack_task(self.order.id, 'http://testserver')
        self.assertEqual(TechPackArtifact.objects.filter(order=self.order).count(), 1)


class EmbroideryArtifactTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(email='embroidery@example.com', password='pw12345678')
        self.garment = GarmentType.objects.create(
            name='Test Tee', slug='embr-test-tee', svg_key='tee', base_price=Decimal('18.00'),
        )
        self.design = Design.objects.create(
            user=self.user, garment_type=self.garment, base_color='#141414', layers=[], price=Decimal('18.00'),
        )

    def test_content_hash_is_stable_for_identical_input(self):
        self.assertEqual(
            _embroidery_content_hash('HELLO', 18, 1),
            _embroidery_content_hash('HELLO', 18, 1),
        )

    def test_content_hash_changes_when_text_changes(self):
        self.assertNotEqual(
            _embroidery_content_hash('HELLO', 18, 1),
            _embroidery_content_hash('GOODBYE', 18, 1),
        )

    def test_generates_a_valid_dst_and_caches_it_under_the_content_hash(self):
        generate_embroidery_task(self.design.id, 'l1', 'HELLO', 18, 1)
        artifact = EmbroideryArtifact.objects.get(design=self.design, layer_id='l1')
        self.assertEqual(artifact.content_hash, _embroidery_content_hash('HELLO', 18, 1))
        with artifact.file.open('rb') as f:
            header = f.read(3)
        self.assertEqual(header, b'LA:')

    def test_editing_the_layer_replaces_the_cached_file_not_duplicates_it(self):
        generate_embroidery_task(self.design.id, 'l1', 'HELLO', 18, 1)
        generate_embroidery_task(self.design.id, 'l1', 'GOODBYE', 18, 1)
        self.assertEqual(EmbroideryArtifact.objects.filter(design=self.design, layer_id='l1').count(), 1)
        artifact = EmbroideryArtifact.objects.get(design=self.design, layer_id='l1')
        self.assertEqual(artifact.content_hash, _embroidery_content_hash('GOODBYE', 18, 1))
