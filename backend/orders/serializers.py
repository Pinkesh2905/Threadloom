from rest_framework import serializers

from accounts.models import Address
from designer.models import Design
from threadloom.money import build_totals, CURRENCY_CODE
from .models import Order


class OrderSerializer(serializers.ModelSerializer):
    design = serializers.PrimaryKeyRelatedField(queryset=Design.objects.all())
    garment_name = serializers.CharField(source='design.garment_type.name', read_only=True)
    customer_name = serializers.SerializerMethodField()
    currency = serializers.SerializerMethodField()
    # A shipping address is mandatory: this is a physical made-to-order
    # product, so an order without one can never be fulfilled.
    address_id = serializers.PrimaryKeyRelatedField(
        queryset=Address.objects.all(), source='address', write_only=True,
    )

    class Meta:
        model = Order
        fields = (
            'id', 'design', 'garment_name', 'customer_name', 'size', 'quantity',
            'unit_price', 'subtotal', 'gst_rate', 'gst_amount', 'shipping_amount',
            'total_price', 'currency', 'status', 'address_id',
            'razorpay_order_id', 'paid_at',
            'shipping_name', 'shipping_line1', 'shipping_line2', 'shipping_city',
            'shipping_state', 'shipping_postal_code', 'shipping_country', 'shipping_phone',
            'created_at',
        )
        read_only_fields = (
            'id', 'unit_price', 'subtotal', 'gst_rate', 'gst_amount', 'shipping_amount',
            'total_price', 'status', 'razorpay_order_id', 'paid_at',
            'shipping_name', 'shipping_line1', 'shipping_line2', 'shipping_city',
            'shipping_state', 'shipping_postal_code', 'shipping_country', 'shipping_phone',
            'created_at',
        )

    def get_customer_name(self, obj):
        return obj.user.display_name or obj.user.email

    def get_currency(self, obj):
        return CURRENCY_CODE

    def validate_design(self, design):
        request = self.context['request']
        if design.user_id != request.user.id:
            raise serializers.ValidationError('You can only order your own designs.')
        return design

    # DRF derives this hook's name from the *declared field* (address_id),
    # not from its `source`. Naming it validate_address silently never runs.
    def validate_address_id(self, address):
        request = self.context['request']
        if address.user_id != request.user.id:
            raise serializers.ValidationError('That address does not belong to you.')
        missing = [
            label for label, value in (
                ('full name', address.full_name),
                ('address line 1', address.line1),
                ('city', address.city),
                ('postal code', address.postal_code),
            ) if not str(value).strip()
        ]
        if missing:
            raise serializers.ValidationError(
                f"This address is incomplete — add its {', '.join(missing)} before ordering.",
            )
        return address

    def create(self, validated_data):
        design = validated_data['design']
        quantity = validated_data.get('quantity', 1)
        address = validated_data.pop('address')

        # Priced from the design on the server; the client never supplies an
        # amount, so the total can't be tampered with before payment.
        totals = build_totals(design.price, quantity)
        validated_data['unit_price'] = design.price
        validated_data.update(totals)

        validated_data['shipping_name'] = address.full_name
        validated_data['shipping_line1'] = address.line1
        validated_data['shipping_line2'] = address.line2
        validated_data['shipping_city'] = address.city
        validated_data['shipping_state'] = address.state
        validated_data['shipping_postal_code'] = address.postal_code
        validated_data['shipping_country'] = address.country
        validated_data['shipping_phone'] = address.phone

        validated_data['status'] = Order.Status.PENDING_PAYMENT
        return super().create(validated_data)
