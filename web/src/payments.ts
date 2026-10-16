export interface ChargeResult {
  id: string;
  amountCents: number;
}

export interface PaymentGateway {
  charge(amountCents: number): Promise<ChargeResult>;
}

export class GatewayError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function isRetryable(error: unknown): boolean {
  return !(error instanceof GatewayError) || error.status >= 500;
}

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class PaymentClient {
  private readonly maxAttempts: number;
  private readonly baseDelayMs: number;

  constructor(
    private readonly gateway: PaymentGateway,
    options: RetryOptions = {},
  ) {
    this.maxAttempts = options.maxAttempts ?? 6;
    this.baseDelayMs = options.baseDelayMs ?? 1000;
  }

  async charge(amountCents: number): Promise<ChargeResult> {
    for (let attempt = 1; ; attempt++) {
      try {
        return await this.gateway.charge(amountCents);
      } catch (error) {
        if (attempt >= this.maxAttempts || !isRetryable(error)) {
          throw error;
        }
        await sleep(this.baseDelayMs * 2 ** (attempt - 1));
      }
    }
  }
}
