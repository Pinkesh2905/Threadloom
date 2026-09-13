from rest_framework import viewsets, permissions
from .models import GarmentType
from .serializers import GarmentTypeListSerializer, GarmentTypeDetailSerializer


class GarmentTypeViewSet(viewsets.ReadOnlyModelViewSet):
    """Public read-only catalog — anyone can browse garment types, even
    signed out, since picking a garment is the entry point into the studio."""

    queryset = GarmentType.objects.filter(is_active=True).prefetch_related('print_zones', 'style_options')
    permission_classes = (permissions.AllowAny,)
    lookup_field = 'slug'

    def get_serializer_class(self):
        if self.action == 'list':
            return GarmentTypeListSerializer
        return GarmentTypeDetailSerializer
