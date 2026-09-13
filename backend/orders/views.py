from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import HttpResponse, FileResponse
from .models import Order
from .serializers import OrderSerializer
from production.models import TechPackArtifact, OrderStatusChange
from production.tasks import generate_tech_pack_task
from production.fabric import estimate_fabric_yield
from production.qr import generate_order_qr_png


class IsOwnerOrStaff(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return request.user.is_staff or obj.user_id == request.user.id


class OrderViewSet(viewsets.ModelViewSet):
    """Create and view your own orders (staff can see and manage all of
    them). No payment processing yet — that's Phase 5's Stripe checkout."""

    serializer_class = OrderSerializer
    permission_classes = (permissions.IsAuthenticated,)
    http_method_names = ['get', 'post', 'head', 'options']

    def get_queryset(self):
        qs = Order.objects.select_related('design', 'design__garment_type', 'user')
        if self.request.user.is_staff:
            return qs
        return qs.filter(user=self.request.user)

    def get_permissions(self):
        if self.action in ('retrieve', 'tech_pack', 'fabric_estimate', 'qr', 'status_history'):
            return [permissions.IsAuthenticated(), IsOwnerOrStaff()]
        if self.action == 'set_status':
            return [permissions.IsAdminUser()]
        return super().get_permissions()

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'], url_path='set-status')
    def set_status(self, request, pk=None):
        order = self.get_object()
        new_status = request.data.get('status')
        valid_statuses = dict(Order.Status.choices)
        if new_status not in valid_statuses:
            return Response({'detail': 'Invalid status.'}, status=status.HTTP_400_BAD_REQUEST)
        old_status = order.status
        if new_status != old_status:
            order.status = new_status
            order.save(update_fields=['status'])
            OrderStatusChange.objects.create(
                order=order, changed_by=request.user, from_status=old_status, to_status=new_status,
            )
            # The cached tech pack prints the order status — drop it so the
            # next download regenerates with the current status.
            TechPackArtifact.objects.filter(order=order).delete()
        return Response(self.get_serializer(order).data)

    @action(detail=True, methods=['get'], url_path='status-history')
    def status_history(self, request, pk=None):
        order = self.get_object()
        changes = order.status_changes.select_related('changed_by')
        return Response([
            {
                'from_status': c.from_status,
                'to_status': c.to_status,
                'changed_by': c.changed_by.display_name or c.changed_by.email if c.changed_by else None,
                'changed_at': c.changed_at,
            }
            for c in changes
        ])

    @action(detail=True, methods=['get'], url_path='tech-pack')
    def tech_pack(self, request, pk=None):
        order = self.get_object()
        artifact = TechPackArtifact.objects.filter(order=order).first()
        if not artifact:
            base_url = request.build_absolute_uri('/').rstrip('/')
            generate_tech_pack_task.delay(order.id, base_url)
            artifact = TechPackArtifact.objects.filter(order=order).first()
        if not artifact:
            return Response({'status': 'processing'}, status=status.HTTP_202_ACCEPTED)
        response = FileResponse(artifact.file.open('rb'), content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="order-{order.id}-tech-pack.pdf"'
        return response

    @action(detail=True, methods=['get'], url_path='fabric-estimate')
    def fabric_estimate(self, request, pk=None):
        order = self.get_object()
        estimate = estimate_fabric_yield(order.design.garment_type.svg_key, order.quantity)
        return Response(estimate)

    @action(detail=True, methods=['get'], url_path='qr')
    def qr(self, request, pk=None):
        order = self.get_object()
        base_url = request.build_absolute_uri('/').rstrip('/')
        png_bytes = generate_order_qr_png(order.id, base_url)
        return HttpResponse(png_bytes, content_type='image/png')
