import { taxCents } from "../src/pricing";
import { generateCarts, profiles } from "./support/carts";

describe.each(profiles)("tax: $name", (profile) => {
  test("is a whole number of cents", () => {
    for (const cart of generateCarts(profile)) {
      for (const line of cart) {
        expect(Number.isInteger(taxCents(line.unitCents * line.quantity))).toBe(true);
      }
    }
  });

  test("taxing lines separately is within a cent per line of taxing the total", () => {
    for (const cart of generateCarts(profile)) {
      const amounts = cart.map((line) => line.unitCents * line.quantity);
      const separate = amounts.reduce((sum, amount) => sum + taxCents(amount), 0);
      const together = taxCents(amounts.reduce((sum, amount) => sum + amount, 0));
      expect(Math.abs(separate - together)).toBeLessThanOrEqual(cart.length);
    }
  });
});
