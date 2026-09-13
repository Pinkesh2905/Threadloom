from django.contrib import admin
from .models import TechPackArtifact, EmbroideryArtifact, OrderStatusChange


@admin.register(TechPackArtifact)
class TechPackArtifactAdmin(admin.ModelAdmin):
    list_display = ('order', 'created_at')
    readonly_fields = ('order', 'file', 'created_at')


@admin.register(EmbroideryArtifact)
class EmbroideryArtifactAdmin(admin.ModelAdmin):
    list_display = ('design', 'layer_id', 'created_at')
    readonly_fields = ('design', 'layer_id', 'content_hash', 'file', 'created_at')


@admin.register(OrderStatusChange)
class OrderStatusChangeAdmin(admin.ModelAdmin):
    list_display = ('order', 'from_status', 'to_status', 'changed_by', 'changed_at')
    readonly_fields = ('order', 'from_status', 'to_status', 'changed_by', 'changed_at')
