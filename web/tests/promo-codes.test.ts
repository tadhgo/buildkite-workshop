import { PROMOS, lineTotalCents, promoDiscountCents } from "../src/pricing";
import { generateCarts, profiles } from "./support/carts";

const codes = Object.keys(PROMOS);

describe.each(profiles)("promo codes: $name", (profile) => {
  test("never discount more than the cart is worth", () => {
    for (const cart of generateCarts(profile)) {
      const amount = cart.reduce((sum, line) => sum + lineTotalCents(line), 0);
      for (const code of codes) {
        const discount = promoDiscountCents(amount, code);
        expect(discount).toBeGreaterThanOrEqual(0);
        expect(discount).toBeLessThanOrEqual(amount);
      }
    }
  });

  test("ignore case and spaces, and unknown codes give nothing", () => {
    for (const cart of generateCarts(profile)) {
      const amount = cart.reduce((sum, line) => sum + lineTotalCents(line), 0);
      for (const code of codes) {
        expect(promoDiscountCents(amount, ` ${code.toLowerCase()} `)).toBe(
          promoDiscountCents(amount, code),
        );
      }
      expect(promoDiscountCents(amount, "NOTACODE")).toBe(0);
    }
  });
});
