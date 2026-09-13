from rest_framework.routers import DefaultRouter
from .views import GarmentTypeViewSet

router = DefaultRouter()
router.register('garment-types', GarmentTypeViewSet, basename='garment-types')

urlpatterns = router.urls
