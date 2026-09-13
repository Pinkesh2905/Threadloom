from django.contrib import admin
from .models import GarmentType, PrintZone, GarmentStyleOption


class PrintZoneInline(admin.TabularInline):
    model = PrintZone
    extra = 0


class GarmentStyleOptionInline(admin.TabularInline):
    model = GarmentStyleOption
    extra = 0


@admin.register(GarmentType)
class GarmentTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'base_price', 'is_active', 'sort_order')
    prepopulated_fields = {'slug': ('name',)}
    inlines = [PrintZoneInline, GarmentStyleOptionInline]
