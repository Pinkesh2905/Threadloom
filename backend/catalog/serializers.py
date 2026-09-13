from rest_framework import serializers
from .models import GarmentType, PrintZone, GarmentStyleOption


class PrintZoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrintZone
        fields = ('id', 'key', 'label', 'x', 'y', 'width', 'height', 'dpi')


class GarmentStyleOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = GarmentStyleOption
        fields = ('id', 'category', 'category_label', 'key', 'label', 'price_delta', 'is_default')


class GarmentTypeListSerializer(serializers.ModelSerializer):
    class Meta:
        model = GarmentType
        fields = ('id', 'name', 'slug', 'svg_key', 'base_price')


class GarmentTypeDetailSerializer(serializers.ModelSerializer):
    print_zones = PrintZoneSerializer(many=True, read_only=True)
    style_options = GarmentStyleOptionSerializer(many=True, read_only=True)

    class Meta:
        model = GarmentType
        fields = (
            'id', 'name', 'slug', 'description', 'svg_key',
            'viewbox_width', 'viewbox_height', 'base_price',
            'print_zones', 'style_options',
        )
