import { quoteOrder } from "../src/pricing";
import { generateCarts, profiles } from "./support/carts";

describe.each(profiles)("order total: $name", (profile) => {
  test("adds up from its parts", () => {
    for (const cart of generateCarts(profile)) {
      const q = quoteOrder(cart, "KITE10");
      expect(q.totalCents).toBe(
        q.subtotalCents - q.bulkDiscountCents - q.promoDiscountCents + q.shippingCents + q.taxCents,
      );
    }
  });

  test("never drops below zero", () => {
    for (const cart of generateCarts(profile)) {
      expect(quoteOrder(cart, "WINDY5").totalCents).toBeGreaterThanOrEqual(0);
    }
  });
});
