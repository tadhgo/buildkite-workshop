export interface Product {
  id: string;
  name: string;
  priceCents: number;
}

export const catalog: Product[] = [
  {
    id: "the-agent",
    name: "The Agent",
    priceCents: 4900,
  },
  {
    id: "parallel-pair",
    name: "Parallel Pair",
    priceCents: 8900,
  },
  {
    id: "pipeline-box-kite",
    name: "Pipeline Box Kite",
    priceCents: 6500,
  },
  {
    id: "green-build-delta",
    name: "Green Build Delta",
    priceCents: 5400,
  },
  {
    id: "the-cluster",
    name: "The Cluster",
    priceCents: 12900,
  },
  {
    id: "hosted-glider",
    name: "Hosted Glider",
    priceCents: 3900,
  },
];

export function findProduct(id: string): Product | undefined {
  return catalog.find((product) => product.id === id);
}
