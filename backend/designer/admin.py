from django.contrib import admin
from .models import Design, UploadedAsset


@admin.register(Design)
class DesignAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'garment_type', 'price', 'updated_at')
    list_filter = ('garment_type',)


@admin.register(UploadedAsset)
class UploadedAssetAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'width', 'height', 'created_at')
