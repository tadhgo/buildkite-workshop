import { formatPrice } from "../src/price";

describe("formatPrice", () => {
  test("formats whole dollars", () => {
    expect(formatPrice(4900)).toBe("$49.00");
  });

  test("formats cents", () => {
    expect(formatPrice(1250)).toBe("$12.50");
  });

  test("adds thousands separators", () => {
    expect(formatPrice(123456)).toBe("$1,234.56");
  });

  test("formats zero", () => {
    expect(formatPrice(0)).toBe("$0.00");
  });
});
