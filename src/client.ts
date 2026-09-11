import { PricesaurusError } from "./errors.js";
import type {
  Account,
  Alert,
  AlertInput,
  Envelope,
  ExtractInput,
  Job,
  ListProductsInput,
  PricesaurusOptions,
  Product,
  RequestOptions,
  Snapshot,
  WatchInput,
} from "./types.js";

const DEFAULT_BASE_URL = "https://pricesaurus.com/api/v1";

export class Pricesaurus {
  readonly baseUrl: string;
  private readonly token: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: PricesaurusOptions) {
    const token = options.token.trim();

    if (token === "") {
      throw new PricesaurusError(0, "invalid_config", "A developer token is required.");
    }

    this.token = token;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.fetchImpl = options.fetch ?? fetch;
  }

  me(options: RequestOptions = {}): Promise<Envelope<Account>> {
    return this.request("GET", "/me", undefined, options);
  }

  async extract(input: ExtractInput, options: RequestOptions = {}): Promise<Envelope<Snapshot>> {
    this.requireUrl(input.url);

    return this.request("POST", "/extract", input, options);
  }

  async watch(input: WatchInput, options: RequestOptions = {}): Promise<Envelope<Product>> {
    this.requireUrl(input.url);

    return this.request("POST", "/products", input, options);
  }

  products(
    input: ListProductsInput = {},
    options: RequestOptions = {},
  ): Promise<Envelope<Product[]>> {
    const query = new URLSearchParams();

    if (input.per_page !== undefined) {
      query.set("per_page", String(input.per_page));
    }

    if (input.starting_after !== undefined) {
      query.set("starting_after", input.starting_after);
    }

    const suffix = query.size > 0 ? `?${query.toString()}` : "";

    return this.request("GET", `/products${suffix}`, undefined, options);
  }

  product(id: string, options: RequestOptions = {}): Promise<Envelope<Product>> {
    return this.request("GET", `/products/${id}`, undefined, options);
  }

  check(id: string, options: RequestOptions = {}): Promise<Envelope<Job>> {
    return this.request("POST", `/products/${id}/checks`, undefined, options);
  }

  alert(
    productId: string,
    input: AlertInput,
    options: RequestOptions = {},
  ): Promise<Envelope<Alert>> {
    return this.request("POST", `/products/${productId}/alerts`, input, options);
  }

  private requireUrl(url: string): void {
    try {
      new URL(url);
    } catch {
      throw new PricesaurusError(0, "invalid_url", `Not a valid URL: ${url}`);
    }
  }

  private async request<T>(
    method: string,
    path: string,
    body: unknown,
    options: RequestOptions,
  ): Promise<T> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      Accept: "application/json",
    };

    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    if (options.idempotencyKey !== undefined) {
      headers["Idempotency-Key"] = options.idempotencyKey;
    }

    let response: Response;

    try {
      response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Network request failed.";

      throw new PricesaurusError(0, "network_error", message, true);
    }

    const payload = await this.readJson(response);

    if (!response.ok) {
      const error = this.errorShape(payload);

      throw new PricesaurusError(response.status, error.code, error.message, error.retryable);
    }

    return payload as T;
  }

  private async readJson(response: Response): Promise<unknown> {
    try {
      return await response.json();
    } catch {
      throw new PricesaurusError(
        response.status,
        "invalid_json",
        "The API returned a body that is not JSON.",
        true,
      );
    }
  }

  private errorShape(payload: unknown): { code: string; message: string; retryable: boolean } {
    if (typeof payload !== "object" || payload === null || !("error" in payload)) {
      return { code: "http_error", message: "Request failed.", retryable: false };
    }

    const error = (payload as { error: unknown }).error;

    if (typeof error !== "object" || error === null) {
      return { code: "http_error", message: "Request failed.", retryable: false };
    }

    const record = error as Record<string, unknown>;

    return {
      code: typeof record.code === "string" ? record.code : "http_error",
      message: typeof record.message === "string" ? record.message : "Request failed.",
      retryable: record.retryable === true,
    };
  }
}
