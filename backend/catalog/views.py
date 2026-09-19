from rest_framework import viewsets, permissions
from .models import GarmentType
from .serializers import GarmentTypeListSerializer, GarmentTypeDetailSerializer


class GarmentTypeViewSet(viewsets.ReadOnlyModelViewSet):
    """Public read-only catalog — anyone can browse garment types, even
    signed out, since picking a garment is the entry point into the studio."""

    queryset = GarmentType.objects.filter(is_active=True).prefetch_related('print_zones', 'style_options')
    permission_classes = (permissions.AllowAny,)
    lookup_field = 'slug'
    # `department` is deliberately *not* a filterset field — it needs the
    # unisex-spans-both-departments handling in get_queryset below, and a
    # plain equality filter here would override that.
    filterset_fields = ('category',)

    def get_serializer_class(self):
        if self.action == 'list':
            return GarmentTypeListSerializer
        return GarmentTypeDetailSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        # Unisex garments belong in both departments, which a plain equality
        # filter on `department` would hide.
        department = self.request.query_params.get('department')
        if department in (GarmentType.Department.MEN, GarmentType.Department.WOMEN):
            qs = qs.filter(department__in=[department, GarmentType.Department.UNISEX])
        return qs
