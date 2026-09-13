from rest_framework import serializers
from designer.models import Design
from accounts.models import Address
from .models import Order


class OrderSerializer(serializers.ModelSerializer):
    design = serializers.PrimaryKeyRelatedField(queryset=Design.objects.all())
    garment_name = serializers.CharField(source='design.garment_type.name', read_only=True)
    customer_name = serializers.SerializerMethodField()
    address_id = serializers.PrimaryKeyRelatedField(
        queryset=Address.objects.all(), source='address', write_only=True, required=False, allow_null=True,
    )

    class Meta:
        model = Order
        fields = (
            'id', 'design', 'garment_name', 'customer_name', 'size', 'quantity',
            'unit_price', 'total_price', 'status', 'address_id',
            'shipping_name', 'shipping_line1', 'shipping_line2', 'shipping_city',
            'shipping_state', 'shipping_postal_code', 'shipping_country', 'shipping_phone',
            'created_at',
        )
        read_only_fields = (
            'id', 'unit_price', 'total_price', 'status',
            'shipping_name', 'shipping_line1', 'shipping_line2', 'shipping_city',
            'shipping_state', 'shipping_postal_code', 'shipping_country', 'shipping_phone',
            'created_at',
        )

    def get_customer_name(self, obj):
        return obj.user.display_name or obj.user.email

    def validate_design(self, design):
        request = self.context['request']
        if design.user_id != request.user.id:
            raise serializers.ValidationError('You can only order your own designs.')
        return design

    def validate(self, attrs):
        address = attrs.get('address')
        if address is not None:
            request = self.context['request']
            if address.user_id != request.user.id:
                raise serializers.ValidationError({'address_id': 'That address does not belong to you.'})
        return attrs

    def create(self, validated_data):
        design = validated_data['design']
        quantity = validated_data.get('quantity', 1)
        validated_data['unit_price'] = design.price
        validated_data['total_price'] = design.price * quantity

        address = validated_data.pop('address', None)
        if address is not None:
            validated_data['shipping_name'] = address.full_name
            validated_data['shipping_line1'] = address.line1
            validated_data['shipping_line2'] = address.line2
            validated_data['shipping_city'] = address.city
            validated_data['shipping_state'] = address.state
            validated_data['shipping_postal_code'] = address.postal_code
            validated_data['shipping_country'] = address.country
            validated_data['shipping_phone'] = address.phone

        return super().create(validated_data)
