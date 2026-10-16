import type { LineItem } from "../../src/pricing";
import { CARTS_PER_CHECK } from "./workload";

export interface CartProfile {
  name: string;
  lines: [number, number];
  quantity: [number, number];
  unitCents: [number, number];
}

export const profiles: CartProfile[] = [
  { name: "single items", lines: [1, 1], quantity: [1, 1], unitCents: [300, 15000] },
  { name: "small carts", lines: [1, 4], quantity: [1, 3], unitCents: [300, 9000] },
  { name: "mixed carts", lines: [2, 12], quantity: [1, 25], unitCents: [300, 15000] },
  { name: "bulk orders", lines: [1, 6], quantity: [10, 120], unitCents: [300, 4000] },
  { name: "big spenders", lines: [5, 20], quantity: [1, 10], unitCents: [5000, 30000] },
];

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CATALOG_SIZE = 500;

function catalogPrice(profile: CartProfile, item: number): number {
  const [min, max] = profile.unitCents;
  return min + ((item * 7919) % (max - min + 1));
}

function seedFor(name: string): number {
  let hash = 2166136261;
  for (const char of name) {
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  }
  return hash >>> 0;
}

export function* generateCarts(
  profile: CartProfile,
  count = CARTS_PER_CHECK,
): Generator<LineItem[]> {
  const random = seededRandom(seedFor(profile.name));
  const between = ([min, max]: [number, number]) =>
    min + Math.floor(random() * (max - min + 1));
  for (let i = 0; i < count; i++) {
    const lines: LineItem[] = [];
    const lineCount = between(profile.lines);
    for (let j = 0; j < lineCount; j++) {
      const item = between([1, CATALOG_SIZE]);
      lines.push({
        sku: `KITE-${item.toString().padStart(3, "0")}`,
        unitCents: catalogPrice(profile, item),
        quantity: between(profile.quantity),
      });
    }
    yield lines;
  }
}

export function shuffled<T>(items: T[], seed: number): T[] {
  const random = seededRandom(seed);
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
