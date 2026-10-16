import { loyaltyPoints, quoteOrder } from "../src/pricing";
import { generateCarts, profiles } from "./support/carts";

describe.each(profiles)("loyalty points: $name", (profile) => {
  test("a bigger order never earns fewer points", () => {
    for (const cart of generateCarts(profile)) {
      const total = quoteOrder(cart).totalCents;
      expect(loyaltyPoints(total + 100)).toBeGreaterThanOrEqual(loyaltyPoints(total));
    }
  });

  test("match the quote", () => {
    for (const cart of generateCarts(profile)) {
      const quote = quoteOrder(cart);
      expect(quote.loyaltyPoints).toBe(loyaltyPoints(quote.totalCents));
    }
  });
});
