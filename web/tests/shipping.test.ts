import { FREE_SHIPPING_CENTS, SHIPPING_CAP_CENTS, quoteOrder } from "../src/pricing";
import { generateCarts, profiles } from "./support/carts";

describe.each(profiles)("shipping: $name", (profile) => {
  test("is free once the order reaches the threshold", () => {
    for (const cart of generateCarts(profile)) {
      const quote = quoteOrder(cart);
      const discounted = quote.subtotalCents - quote.bulkDiscountCents;
      if (discounted >= FREE_SHIPPING_CENTS) {
        expect(quote.shippingCents).toBe(0);
      } else {
        expect(quote.shippingCents).toBeGreaterThan(0);
      }
    }
  });

  test("never goes over the cap", () => {
    for (const cart of generateCarts(profile)) {
      expect(quoteOrder(cart).shippingCents).toBeLessThanOrEqual(SHIPPING_CAP_CENTS);
    }
  });
});
