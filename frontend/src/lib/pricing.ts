import type { GarmentTypeDetail, DesignLayer } from '@/types/designer';

/**
 * Mirrors backend/designer/pricing.py exactly (same constants, same rule
 * order) so the studio shows an accurate live price before saving — the
 * server always recomputes and is the source of truth.
 */
const ZONE_SETUP_FEE = 5.0;
const LAYER_FEE_BY_TYPE: Record<string, number> = {
  text: 2.0,
  image: 4.0,
};

export function computePrice(
  garmentType: GarmentTypeDetail,
  selectedOptions: Record<string, string>,
  layers: DesignLayer[]
): number {
  let price = parseFloat(garmentType.base_price);

  for (const [category, key] of Object.entries(selectedOptions)) {
    const option = garmentType.style_options.find((o) => o.category === category && o.key === key);
    if (option) price += parseFloat(option.price_delta);
  }

  const zonesUsed = new Set(layers.map((l) => l.zone));
  price += ZONE_SETUP_FEE * zonesUsed.size;

  for (const layer of layers) {
    price += LAYER_FEE_BY_TYPE[layer.type] ?? 0;
  }

  return Math.round(price * 100) / 100;
}
