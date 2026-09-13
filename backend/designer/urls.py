from rest_framework.routers import DefaultRouter
from .views import DesignViewSet, UploadedAssetViewSet

router = DefaultRouter()
router.register('designs', DesignViewSet, basename='designs')
router.register('assets', UploadedAssetViewSet, basename='designer-assets')

urlpatterns = router.urls
