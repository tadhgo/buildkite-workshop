import { quoteOrder } from "../src/pricing";
import { generateCarts, profiles } from "./support/carts";

describe.each(profiles)("rounding: $name", (profile) => {
  test("every amount in a quote is whole cents", () => {
    for (const cart of generateCarts(profile)) {
      for (const value of Object.values(quoteOrder(cart, "KITE10"))) {
        expect(Number.isInteger(value)).toBe(true);
      }
    }
  });

  test("no amount in a quote is negative", () => {
    for (const cart of generateCarts(profile)) {
      for (const value of Object.values(quoteOrder(cart, "HIGHFLYER"))) {
        expect(value).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
