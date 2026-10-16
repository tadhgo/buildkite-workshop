import { quoteOrder } from "../src/pricing";
import { generateCarts, profiles, shuffled } from "./support/carts";

describe.each(profiles)("line order: $name", (profile) => {
  test("doesn't change the quote", () => {
    let seed = 1;
    for (const cart of generateCarts(profile)) {
      expect(quoteOrder(shuffled(cart, seed++))).toEqual(quoteOrder(cart));
    }
  });

  test("doesn't change the quote with a promo code", () => {
    let seed = 1000;
    for (const cart of generateCarts(profile)) {
      expect(quoteOrder(shuffled(cart, seed++), "HIGHFLYER")).toEqual(
        quoteOrder(cart, "HIGHFLYER"),
      );
    }
  });
});
