import json
import logging

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.http import HttpResponse, FileResponse
from django.views.decorators.csrf import csrf_exempt
from .models import Order
from .serializers import OrderSerializer
from . import payments
from production.models import TechPackArtifact, OrderStatusChange
from production.tasks import generate_tech_pack_task
from production.fabric import estimate_fabric_yield
from production.qr import generate_order_qr_png


class IsOwnerOrStaff(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return request.user.is_staff or obj.user_id == request.user.id


logger = logging.getLogger(__name__)


class OrderViewSet(viewsets.ModelViewSet):
    """Create and view your own orders (staff can see and manage all of
    them). Orders are created unpaid and only reach production once a
    Razorpay payment is verified server-side — see orders.payments."""

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
        # Staff move orders through fulfilment; they cannot hand-wave an
        # order into a paid state, which only a verified payment can do.
        if new_status not in Order.STAFF_SETTABLE_STATUSES:
            return Response(
                {'detail': 'That status cannot be set by hand. Payment states are set by the payment gateway.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not order.is_paid and new_status != Order.Status.CANCELLED:
            return Response(
                {'detail': 'This order has not been paid for yet.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
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

    @action(detail=True, methods=['post'], url_path='create-payment')
    def create_payment(self, request, pk=None):
        """Register this order with Razorpay and hand the browser what it
        needs to open checkout. The amount comes from the stored order, not
        from the request."""
        order = self.get_object()

        if order.user_id != request.user.id:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        if order.is_paid:
            return Response({'detail': 'This order is already paid.'}, status=status.HTTP_400_BAD_REQUEST)
        if not order.has_shipping_address:
            return Response(
                {'detail': 'This order has no shipping address.'}, status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            if not order.razorpay_order_id:
                order.razorpay_order_id = payments.create_gateway_order(order)
                order.save(update_fields=['razorpay_order_id'])
        except payments.PaymentNotConfigured as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except Exception:
            logger.exception('Razorpay order creation failed for order %s', order.pk)
            return Response(
                {'detail': 'Could not reach the payment provider. Please try again.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        from django.conf import settings as dj_settings
        from threadloom.money import to_minor_units, CURRENCY_CODE

        return Response({
            'razorpay_order_id': order.razorpay_order_id,
            'razorpay_key_id': dj_settings.RAZORPAY_KEY_ID,
            'amount': to_minor_units(order.total_price),
            'currency': CURRENCY_CODE,
            'order_id': order.pk,
        })

    @action(detail=True, methods=['post'], url_path='verify-payment')
    def verify_payment(self, request, pk=None):
        """Checkout handback. Treated as a prompt to verify, never as proof
        of payment — the signature is what decides."""
        order = self.get_object()
        if order.user_id != request.user.id:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        payment_id = request.data.get('razorpay_payment_id', '')
        signature = request.data.get('razorpay_signature', '')
        gateway_order_id = request.data.get('razorpay_order_id', '')

        if gateway_order_id != order.razorpay_order_id:
            return Response({'detail': 'Payment does not match this order.'}, status=status.HTTP_400_BAD_REQUEST)

        if not payments.verify_checkout_signature(gateway_order_id, payment_id, signature):
            payments.mark_failed(order, 'signature mismatch on checkout handback')
            return Response({'detail': 'Payment could not be verified.'}, status=status.HTTP_400_BAD_REQUEST)

        payments.mark_paid(order, payment_id, signature)
        return Response(self.get_serializer(order).data)


@csrf_exempt
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def razorpay_webhook(request):
    """Authoritative payment confirmation.

    Unauthenticated by design — Razorpay calls it — so the HMAC over the raw
    body is the only thing that makes it trustworthy. This is what confirms
    an order when the customer closes the tab before the handback fires.
    """
    signature = request.META.get('HTTP_X_RAZORPAY_SIGNATURE', '')
    if not payments.verify_webhook_signature(request.body, signature):
        logger.warning('Rejected Razorpay webhook with a bad signature')
        return Response({'detail': 'Invalid signature.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        event = json.loads(request.body.decode('utf-8'))
    except (ValueError, UnicodeDecodeError):
        return Response({'detail': 'Malformed payload.'}, status=status.HTTP_400_BAD_REQUEST)

    event_type = event.get('event', '')
    entity = (
        event.get('payload', {}).get('payment', {}).get('entity', {})
        or event.get('payload', {}).get('order', {}).get('entity', {})
    )
    gateway_order_id = entity.get('order_id') or entity.get('id')
    if not gateway_order_id:
        return Response({'detail': 'ok'})

    order = Order.objects.filter(razorpay_order_id=gateway_order_id).first()
    if order is None:
        logger.warning('Razorpay webhook for unknown order %s', gateway_order_id)
        return Response({'detail': 'ok'})

    if event_type in ('payment.captured', 'order.paid'):
        payments.mark_paid(order, entity.get('id', ''))
    elif event_type == 'payment.failed':
        payments.mark_failed(order, entity.get('error_description', ''))

    return Response({'detail': 'ok'})
