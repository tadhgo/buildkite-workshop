import { applyGiftCard, quoteOrder } from "../src/pricing";
import { generateCarts, profiles } from "./support/carts";

const balances = [0, 1000, 2500, 5000, 10000, 50000];

describe.each(profiles)("gift cards: $name", (profile) => {
  test("the card and the charge always add up to the total", () => {
    for (const cart of generateCarts(profile)) {
      const total = quoteOrder(cart).totalCents;
      for (const balance of balances) {
        const result = applyGiftCard(total, balance);
        expect(result.appliedCents + result.chargedCents).toBe(total);
      }
    }
  });

  test("never leave a negative balance", () => {
    for (const cart of generateCarts(profile)) {
      const total = quoteOrder(cart).totalCents;
      for (const balance of balances) {
        expect(applyGiftCard(total, balance).remainingBalanceCents).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
