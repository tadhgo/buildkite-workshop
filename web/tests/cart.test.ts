import { Cart } from "../src/cart";

describe("Cart", () => {
  test("starts empty", () => {
    const cart = new Cart();
    expect(cart.count).toBe(0);
    expect(cart.totalCents).toBe(0);
  });

  test("adds products and totals them", () => {
    const cart = new Cart();
    cart.add("the-agent");
    cart.add("hosted-glider", 2);
    expect(cart.count).toBe(3);
    expect(cart.totalCents).toBe(4900 + 2 * 3900);
  });

  test("adding the same product again increases its quantity", () => {
    const cart = new Cart();
    cart.add("the-agent");
    cart.add("the-agent");
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].quantity).toBe(2);
  });

  test("removes one at a time, then drops the line", () => {
    const cart = new Cart();
    cart.add("the-cluster", 2);
    cart.remove("the-cluster");
    expect(cart.count).toBe(1);
    cart.remove("the-cluster");
    expect(cart.items).toHaveLength(0);
  });

  test("rejects unknown products", () => {
    const cart = new Cart();
    expect(() => cart.add("not-a-kite")).toThrow("Unknown product: not-a-kite");
  });
});
