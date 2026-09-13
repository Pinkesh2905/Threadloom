"""Deterministic, rule-based pricing for a design — no ML, no external calls.

Price = garment base price
      + sum of selected style-option deltas
      + a flat fee per print zone that has at least one layer in it
      + a flat fee per layer, by type (image artwork costs more to produce
        than plain text)
"""

from decimal import Decimal

ZONE_SETUP_FEE = Decimal('5.00')
LAYER_FEE_BY_TYPE = {
    'text': Decimal('2.00'),
    'image': Decimal('4.00'),
}


def compute_price(garment_type, selected_options: dict, layers: list) -> Decimal:
    price = Decimal(garment_type.base_price)

    if selected_options:
        option_lookup = {
            (opt.category, opt.key): opt.price_delta
            for opt in garment_type.style_options.all()
        }
        for category, key in selected_options.items():
            price += option_lookup.get((category, key), Decimal('0'))

    zones_used = {layer.get('zone') for layer in layers if layer.get('zone')}
    price += ZONE_SETUP_FEE * len(zones_used)

    for layer in layers:
        price += LAYER_FEE_BY_TYPE.get(layer.get('type'), Decimal('0'))

    return price.quantize(Decimal('0.01'))
