from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import OrderViewSet, razorpay_webhook

router = DefaultRouter()
router.register('orders', OrderViewSet, basename='orders')

urlpatterns = router.urls + [
    # Called by Razorpay, not the browser. Authenticated by HMAC, not JWT.
    path('payments/razorpay/webhook/', razorpay_webhook, name='razorpay_webhook'),
]
