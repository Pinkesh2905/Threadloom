/**
 * Mirrors backend/threadloom/money.py. The server is authoritative for any
 * amount that reaches an order; this exists so the studio can show a live
 * price and a total breakdown without a round trip.
 */

export const CURRENCY_CODE = 'INR';
export const CURRENCY_SYMBOL = '₹';

export const GST_LOW_RATE = 0.05;
export const GST_HIGH_RATE = 0.12;
export const GST_RATE_THRESHOLD = 1000;

export const SHIPPING_FLAT = 79;
export const FREE_SHIPPING_ABOVE = 1499;

const formatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: CURRENCY_CODE,
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** ₹1,23,456 — Indian digit grouping, not thousands-grouping. */
export function formatMoney(amount: number | string): string {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (!Number.isFinite(value)) return `${CURRENCY_SYMBOL}0`;
  return formatter.format(value);
}

export function gstRateFor(unitPrice: number): number {
  return unitPrice > GST_RATE_THRESHOLD ? GST_HIGH_RATE : GST_LOW_RATE;
}

export function shippingFor(subtotal: number): number {
  return subtotal >= FREE_SHIPPING_ABOVE ? 0 : SHIPPING_FLAT;
}

export interface OrderTotals {
  subtotal: number;
  gstRate: number;
  gstAmount: number;
  shippingAmount: number;
  total: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function buildTotals(unitPrice: number, quantity: number): OrderTotals {
  const subtotal = round2(unitPrice * quantity);
  const gstRate = gstRateFor(unitPrice);
  const gstAmount = round2(subtotal * gstRate);
  const shippingAmount = shippingFor(subtotal);
  return {
    subtotal,
    gstRate,
    gstAmount,
    shippingAmount,
    total: round2(subtotal + gstAmount + shippingAmount),
  };
}
