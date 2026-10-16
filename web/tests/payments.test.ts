import { GatewayError, PaymentClient, type PaymentGateway } from "../src/payments";

function gatewayThatFails(times: number): PaymentGateway & { calls: number } {
  return {
    calls: 0,
    async charge(amountCents: number) {
      this.calls++;
      if (this.calls <= times) {
        throw new GatewayError("503 Service Unavailable", 503);
      }
      return { id: `ch_${this.calls}`, amountCents };
    },
  };
}

describe("payment client", () => {
  test("charges on the first try", async () => {
    const gateway = gatewayThatFails(0);
    const client = new PaymentClient(gateway);
    await expect(client.charge(4900)).resolves.toEqual({ id: "ch_1", amountCents: 4900 });
    expect(gateway.calls).toBe(1);
  });

  test("retries a failed charge", async () => {
    const gateway = gatewayThatFails(5);
    const client = new PaymentClient(gateway);
    await expect(client.charge(4900)).resolves.toEqual({ id: "ch_6", amountCents: 4900 });
    expect(gateway.calls).toBe(6);
  }, 40_000);

  test("gives up after the last attempt", async () => {
    const gateway = gatewayThatFails(1);
    const client = new PaymentClient(gateway, { maxAttempts: 1 });
    await expect(client.charge(4900)).rejects.toThrow("503 Service Unavailable");
    expect(gateway.calls).toBe(1);
  });

  test("doesn't retry a declined card", async () => {
    const gateway: PaymentGateway & { calls: number } = {
      calls: 0,
      async charge() {
        this.calls++;
        throw new GatewayError("402 Card declined", 402);
      },
    };
    const client = new PaymentClient(gateway);
    await expect(client.charge(4900)).rejects.toThrow("402 Card declined");
    expect(gateway.calls).toBe(1);
  });
});
