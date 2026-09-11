export class PricesaurusError extends Error {
  readonly status: number;
  readonly code: string;
  readonly retryable: boolean;

  constructor(status: number, code: string, message: string, retryable = false) {
    super(message);
    this.name = "PricesaurusError";
    this.status = status;
    this.code = code;
    this.retryable = retryable;
  }
}
