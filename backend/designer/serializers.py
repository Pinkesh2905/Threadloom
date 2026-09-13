from rest_framework import serializers
from catalog.models import GarmentType
from .models import Design, UploadedAsset
from .pricing import compute_price


class DesignSerializer(serializers.ModelSerializer):
    garment_type = serializers.PrimaryKeyRelatedField(queryset=GarmentType.objects.filter(is_active=True))
    garment_type_slug = serializers.CharField(source='garment_type.slug', read_only=True)
    garment_type_svg_key = serializers.CharField(source='garment_type.svg_key', read_only=True)
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = Design
        fields = (
            'id', 'garment_type', 'garment_type_slug', 'garment_type_svg_key', 'name', 'base_color',
            'selected_options', 'layers', 'price', 'is_public', 'share_token', 'author_name',
            'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'price', 'share_token', 'created_at', 'updated_at')

    def get_author_name(self, obj):
        return obj.user.display_name or obj.user.email.split('@')[0]

    def _price_for(self, garment_type, validated_data):
        return compute_price(
            garment_type,
            validated_data.get('selected_options', {}),
            validated_data.get('layers', []),
        )

    def create(self, validated_data):
        validated_data['price'] = self._price_for(validated_data['garment_type'], validated_data)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        garment_type = validated_data.get('garment_type', instance.garment_type)
        merged = {
            'selected_options': validated_data.get('selected_options', instance.selected_options),
            'layers': validated_data.get('layers', instance.layers),
        }
        validated_data['price'] = self._price_for(garment_type, merged)
        return super().update(instance, validated_data)


class PublicDesignSerializer(serializers.ModelSerializer):
    """Read-only view of a design for an unlisted share link — no owner
    identity beyond a display name, no write access."""

    garment_type_slug = serializers.CharField(source='garment_type.slug', read_only=True)
    garment_type_svg_key = serializers.CharField(source='garment_type.svg_key', read_only=True)
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = Design
        fields = (
            'id', 'garment_type_slug', 'garment_type_svg_key', 'name', 'base_color',
            'selected_options', 'layers', 'price', 'author_name',
        )

    def get_author_name(self, obj):
        return obj.user.display_name or obj.user.email.split('@')[0]


class UploadedAssetSerializer(serializers.ModelSerializer):
    class Meta:
        model = UploadedAsset
        fields = (
            'id', 'original_image', 'processed_image', 'vector_image',
            'width', 'height', 'dominant_colors', 'suggested_print_method', 'created_at',
        )
        read_only_fields = (
            'id', 'processed_image', 'vector_image', 'width', 'height',
            'dominant_colors', 'suggested_print_method', 'created_at',
        )
