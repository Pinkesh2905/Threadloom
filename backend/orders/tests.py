from decimal import Decimal
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from catalog.models import GarmentType, PrintZone
from designer.models import Design
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
        self.order = Order.objects.create(
            user=self.user, design=self.design, size='M', quantity=1,
            unit_price=Decimal('18.00'), total_price=Decimal('18.00'),
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
        self.assertEqual(change.from_status, 'pending')
        self.assertEqual(change.to_status, 'in_production')
        self.assertEqual(change.changed_by, self.staff)

    def test_setting_the_same_status_does_not_record_a_change(self):
        self.client.force_authenticate(self.staff)
        response = self.client.post(f'/api/orders/{self.order.id}/set-status/', {'status': 'pending'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(OrderStatusChange.objects.filter(order=self.order).count(), 0)

    def test_status_history_endpoint_lists_changes(self):
        self.client.force_authenticate(self.staff)
        self.client.post(f'/api/orders/{self.order.id}/set-status/', {'status': 'shipped'}, format='json')
        response = self.client.get(f'/api/orders/{self.order.id}/status-history/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['to_status'], 'shipped')
        self.assertEqual(response.data[0]['from_status'], 'pending')

    def test_owner_cannot_change_status(self):
        self.client.force_authenticate(self.user)
        response = self.client.post(f'/api/orders/{self.order.id}/set-status/', {'status': 'shipped'}, format='json')
        self.assertEqual(response.status_code, 403)
