import { findProduct, type Product } from "./catalog";

export interface CartLine {
  product: Product;
  quantity: number;
}

export class Cart {
  private lines = new Map<string, CartLine>();

  add(productId: string, quantity = 1): void {
    const product = findProduct(productId);
    if (!product) {
      throw new Error(`Unknown product: ${productId}`);
    }
    const line = this.lines.get(productId);
    if (line) {
      line.quantity += quantity;
    } else {
      this.lines.set(productId, { product, quantity });
    }
  }

  remove(productId: string): void {
    const line = this.lines.get(productId);
    if (!line) {
      return;
    }
    line.quantity -= 1;
    if (line.quantity <= 0) {
      this.lines.delete(productId);
    }
  }

  get items(): CartLine[] {
    return [...this.lines.values()];
  }

  get count(): number {
    return this.items.reduce((sum, line) => sum + line.quantity, 0);
  }

  get totalCents(): number {
    return this.items.reduce(
      (sum, line) => sum + line.product.priceCents * line.quantity,
      0,
    );
  }
}
