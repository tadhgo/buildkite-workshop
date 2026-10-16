import { bulkDiscountPercent, lineTotalCents } from "../src/pricing";
import { generateCarts, profiles } from "./support/carts";

describe.each(profiles)("bulk discount: $name", (profile) => {
  test("matches the price worked out unit by unit", () => {
    for (const cart of generateCarts(profile)) {
      for (const line of cart) {
        const percent = bulkDiscountPercent(line.quantity);
        let hundredths = 0;
        for (let unit = 0; unit < line.quantity; unit++) {
          hundredths += line.unitCents * (100 - percent);
        }
        expect(lineTotalCents(line)).toBe(Math.floor((hundredths + 50) / 100));
      }
    }
  });

  test("never charges more than the undiscounted price", () => {
    for (const cart of generateCarts(profile)) {
      for (const line of cart) {
        expect(lineTotalCents(line)).toBeLessThanOrEqual(line.unitCents * line.quantity);
      }
    }
  });
});
