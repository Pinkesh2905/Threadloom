from rest_framework import viewsets, permissions, mixins, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import FileResponse
from .models import Design, UploadedAsset
from .serializers import DesignSerializer, PublicDesignSerializer, UploadedAssetSerializer
from .tasks import remove_background_task
from .throttling import DesignSaveThrottle
from production.embroidery import EmbroideryError
from production.models import EmbroideryArtifact
from production.tasks import generate_embroidery_task, _embroidery_content_hash


class DesignViewSet(viewsets.ModelViewSet):
    serializer_class = DesignSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return Design.objects.filter(user=self.request.user).select_related('garment_type', 'user')

    def get_throttles(self):
        if self.action in ('create', 'update', 'partial_update'):
            return [DesignSaveThrottle()]
        return super().get_throttles()

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'], url_path='gallery')
    def gallery(self, request):
        """Public template gallery — designs any user has chosen to share."""
        designs = Design.objects.filter(is_public=True).select_related('garment_type', 'user').order_by('-updated_at')[:60]
        serializer = self.get_serializer(designs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='shared/(?P<token>[\\w-]+)', permission_classes=[permissions.AllowAny])
    def shared(self, request, token=None):
        """Public, unauthenticated read-only lookup by share link token."""
        try:
            design = Design.objects.select_related('garment_type', 'user').get(share_token=token)
        except Design.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = PublicDesignSerializer(design)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='clone')
    def clone(self, request, pk=None):
        """Copy a public template (or your own design) into your own account."""
        try:
            source = Design.objects.get(pk=pk)
        except Design.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not source.is_public and source.user_id != request.user.id:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        clone = Design.objects.create(
            user=request.user,
            garment_type=source.garment_type,
            name=f'{source.name} (copy)' if source.name else '',
            base_color=source.base_color,
            selected_options=source.selected_options,
            layers=source.layers,
            price=source.price,
            is_public=False,
        )
        serializer = self.get_serializer(clone)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='embroidery')
    def embroidery(self, request, pk=None):
        """Digitize one text layer into a .dst embroidery machine file.
        Cached by a content hash of (text, font size, scale) so re-requesting
        an unchanged layer re-serves the stored file instead of re-running
        the OpenCV contour trace."""
        design = self.get_object()
        layer_id = request.data.get('layer_id')
        layer = next((l for l in design.layers if l.get('id') == layer_id), None)
        if not layer:
            return Response({'detail': 'Layer not found on this design.'}, status=status.HTTP_404_NOT_FOUND)
        if layer.get('type') != 'text':
            return Response({'detail': 'Only text layers can be digitized for embroidery.'}, status=status.HTTP_400_BAD_REQUEST)

        text = layer.get('text', '')
        font_size = layer.get('fontSize', 18)
        scale = layer.get('scale', 1)
        content_hash = _embroidery_content_hash(text, font_size, scale)

        artifact = EmbroideryArtifact.objects.filter(design=design, layer_id=layer_id, content_hash=content_hash).first()
        if not artifact:
            try:
                generate_embroidery_task.delay(design.id, layer_id, text, font_size, scale)
            except EmbroideryError as exc:
                return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
            artifact = EmbroideryArtifact.objects.filter(design=design, layer_id=layer_id, content_hash=content_hash).first()

        if not artifact:
            return Response({'status': 'processing'}, status=status.HTTP_202_ACCEPTED)

        response = FileResponse(artifact.file.open('rb'), content_type='application/octet-stream')
        response['Content-Disposition'] = f'attachment; filename="design-{design.id}-{layer_id}.dst"'
        return response


class UploadedAssetViewSet(mixins.CreateModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """Upload artwork and clean it up (background removal) in one step.

    In local dev CELERY_TASK_ALWAYS_EAGER=True, so `.delay()` runs the
    cleanup pass synchronously in-process — no Redis/worker required — while
    still going through the same Celery task used in production.
    """

    serializer_class = UploadedAssetSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return UploadedAsset.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        asset = serializer.save(user=self.request.user)
        remove_background_task.delay(asset.pk)
        asset.refresh_from_db()
