export interface LineItem {
  sku: string;
  unitCents: number;
  quantity: number;
}

export interface Quote {
  subtotalCents: number;
  bulkDiscountCents: number;
  promoDiscountCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  loyaltyPoints: number;
}

interface Promo {
  kind: "percent" | "fixed";
  value: number;
  minSubtotalCents?: number;
}

export const PROMOS: Record<string, Promo> = {
  KITE10: { kind: "percent", value: 10 },
  WINDY5: { kind: "fixed", value: 500, minSubtotalCents: 2500 },
  HIGHFLYER: { kind: "percent", value: 20, minSubtotalCents: 20000 },
};

export const FREE_SHIPPING_CENTS = 10000;
export const BASE_SHIPPING_CENTS = 599;
export const SHIPPING_CAP_CENTS = 1999;
export const TAX_BASIS_POINTS = 825;

function roundDiv(numerator: number, denominator: number): number {
  return Math.floor((numerator + Math.floor(denominator / 2)) / denominator);
}

export function bulkDiscountPercent(quantity: number): number {
  if (quantity >= 50) return 15;
  if (quantity >= 20) return 10;
  if (quantity >= 10) return 5;
  return 0;
}

export function lineTotalCents(line: LineItem): number {
  const percent = bulkDiscountPercent(line.quantity);
  return roundDiv(line.unitCents * line.quantity * (100 - percent), 100);
}

export function promoDiscountCents(subtotalCents: number, code?: string): number {
  const promo = code ? PROMOS[code.trim().toUpperCase()] : undefined;
  if (!promo || subtotalCents < (promo.minSubtotalCents ?? 0)) {
    return 0;
  }
  const discount =
    promo.kind === "percent" ? roundDiv(subtotalCents * promo.value, 100) : promo.value;
  return Math.min(discount, subtotalCents);
}

export function shippingCents(amountCents: number, itemCount: number): number {
  if (itemCount === 0 || amountCents >= FREE_SHIPPING_CENTS) {
    return 0;
  }
  return Math.min(BASE_SHIPPING_CENTS + 50 * (itemCount - 1), SHIPPING_CAP_CENTS);
}

export function taxCents(amountCents: number): number {
  return roundDiv(amountCents * TAX_BASIS_POINTS, 10000);
}

export function loyaltyPoints(totalCents: number): number {
  const points = Math.floor(totalCents / 100);
  return totalCents >= 20000 ? points * 2 : points;
}

export function mergeLines(lines: LineItem[]): LineItem[] {
  const merged = new Map<string, LineItem>();
  for (const line of lines) {
    const existing = merged.get(line.sku);
    if (existing) {
      existing.quantity += line.quantity;
    } else {
      merged.set(line.sku, { ...line });
    }
  }
  return [...merged.values()].sort((a, b) => a.sku.localeCompare(b.sku));
}

export function quoteOrder(lines: LineItem[], promoCode?: string): Quote {
  const merged = mergeLines(lines);
  const subtotalCents = merged.reduce((sum, l) => sum + l.unitCents * l.quantity, 0);
  const afterBulk = merged.reduce((sum, l) => sum + lineTotalCents(l), 0);
  const bulkDiscount = subtotalCents - afterBulk;
  const promoDiscount = promoDiscountCents(afterBulk, promoCode);
  const discounted = afterBulk - promoDiscount;
  const itemCount = merged.reduce((sum, l) => sum + l.quantity, 0);
  const shipping = shippingCents(discounted, itemCount);
  const tax = taxCents(discounted);
  const total = discounted + shipping + tax;
  return {
    subtotalCents,
    bulkDiscountCents: bulkDiscount,
    promoDiscountCents: promoDiscount,
    shippingCents: shipping,
    taxCents: tax,
    totalCents: total,
    loyaltyPoints: loyaltyPoints(total),
  };
}

export interface GiftCardResult {
  appliedCents: number;
  chargedCents: number;
  remainingBalanceCents: number;
}

export function applyGiftCard(totalCents: number, balanceCents: number): GiftCardResult {
  const applied = Math.min(totalCents, balanceCents);
  return {
    appliedCents: applied,
    chargedCents: totalCents - applied,
    remainingBalanceCents: balanceCents - applied,
  };
}
