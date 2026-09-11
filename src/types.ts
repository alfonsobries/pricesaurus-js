export type Availability = "in_stock" | "out_of_stock" | "unknown";

export type Snapshot = {
  url?: string;
  canonical_url?: string;
  name?: string | null;
  price?: number | null;
  currency?: string | null;
  availability?: Availability;
  image_url?: string | null;
  store_name?: string | null;
  driver?: string;
  contract?: string | null;
  credits_used?: number | null;
};

export type Product = {
  id: string;
  url?: string;
  canonical_url?: string;
  name?: string;
  price?: number | null;
  currency?: string | null;
  status?: "watching" | "pending" | "failing";
  is_failing?: boolean;
  is_active?: boolean;
};

export type Account = {
  plan?: string;
  products?: number;
  webhook_url?: string | null;
};

export type Job = {
  id: string;
  job_id?: string;
  status?: "queued" | "complete" | "failed";
  poll?: string;
};

export type Alert = {
  id?: string;
  name?: string | null;
  condition?: "drops" | "below" | "above";
  threshold?: number | null;
  is_active?: boolean;
};

export type Envelope<T> = {
  data: T;
  meta?: {
    page?: number;
    per_page?: number;
    total?: number;
    has_more?: boolean;
    next_starting_after?: string | null;
    errors?: unknown[];
  };
};

export type ExtractInput = {
  url: string;
  country?: string;
  currency?: string;
};

export type WatchInput = ExtractInput & {
  name?: string;
};

export type AlertInput = {
  condition: "drops" | "below" | "above";
  threshold?: number;
  name?: string;
};

export type AlertUpdateInput = {
  name?: string;
  is_active?: boolean;
};

export type ListProductsInput = {
  per_page?: number;
  starting_after?: string;
};

export type RequestOptions = {
  idempotencyKey?: string;
};

export type PricesaurusOptions = {
  token: string;
  baseUrl?: string;
  fetch?: typeof fetch;
};
