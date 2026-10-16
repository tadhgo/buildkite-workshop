import { mergeLines, quoteOrder } from "../src/pricing";
import { generateCarts, profiles } from "./support/carts";

describe.each(profiles)("merging lines: $name", (profile) => {
  test("splitting a line in two doesn't change the quote", () => {
    for (const cart of generateCarts(profile)) {
      const split = cart.flatMap((line) =>
        line.quantity > 1
          ? [
              { ...line, quantity: 1 },
              { ...line, quantity: line.quantity - 1 },
            ]
          : [line],
      );
      expect(quoteOrder(split)).toEqual(quoteOrder(cart));
    }
  });

  test("keeps every unit", () => {
    for (const cart of generateCarts(profile)) {
      const units = (lines: typeof cart) => lines.reduce((sum, l) => sum + l.quantity, 0);
      expect(units(mergeLines(cart))).toBe(units(cart));
    }
  });
});
