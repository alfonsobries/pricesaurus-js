import { afterEach, describe, expect, it, vi } from "vitest";
import { Pricesaurus } from "../src/client.js";
import { PricesaurusError } from "../src/errors.js";
import { Pricesaurus as FromIndex, PricesaurusError as ErrorFromIndex } from "../src/index.js";

const jsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const brokenJsonResponse = (status: number): Response =>
  new Response("not-json", {
    status,
    headers: { "Content-Type": "text/plain" },
  });

describe("Pricesaurus", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });
  it("rejects a blank token", () => {
    expect(() => new Pricesaurus({ token: "   " })).toThrow(PricesaurusError);
    expect(() => new Pricesaurus({ token: "" })).toThrowError(/developer token/);
  });

  it("trims the token and strips a trailing slash on the base URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { data: { plan: "plus" } }));
    const api = new Pricesaurus({
      token: "  ps_live_test  ",
      baseUrl: "https://example.test/api/v1/",
      fetch: fetchMock,
    });

    await api.me();

    expect(api.baseUrl).toBe("https://example.test/api/v1");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.test/api/v1/me",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer ps_live_test" }),
      }),
    );
  });

  it("uses global fetch when none is injected", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { data: {} }));
    vi.stubGlobal("fetch", fetchMock);

    const api = new Pricesaurus({ token: "ps_live_test" });
    await api.me();

    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("posts extract with a bearer token and optional idempotency key", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, { data: { name: "Kettle", price: 42.5 } }));
    const api = new Pricesaurus({ token: "ps_live_test", fetch: fetchMock });

    const result = await api.extract(
      { url: "https://shop.example.test/p" },
      { idempotencyKey: "extract-1" },
    );

    expect(result).toEqual({ data: { name: "Kettle", price: 42.5 } });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://pricesaurus.com/api/v1/extract",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer ps_live_test",
          "Content-Type": "application/json",
          "Idempotency-Key": "extract-1",
        }),
        body: JSON.stringify({ url: "https://shop.example.test/p" }),
      }),
    );
  });

  it("rejects an invalid product URL before calling the API", async () => {
    const fetchMock = vi.fn();
    const api = new Pricesaurus({ token: "ps_live_test", fetch: fetchMock });

    await expect(api.extract({ url: "not-a-url" })).rejects.toMatchObject({
      code: "invalid_url",
    });
    await expect(api.watch({ url: "also-bad" })).rejects.toMatchObject({
      code: "invalid_url",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("watches, lists, reads, checks, and creates an alert", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(201, { data: { id: "prod-1", name: "Kettle" } }))
      .mockResolvedValueOnce(jsonResponse(200, { data: [{ id: "prod-1" }] }))
      .mockResolvedValueOnce(jsonResponse(200, { data: [{ id: "prod-1" }] }))
      .mockResolvedValueOnce(jsonResponse(200, { data: [{ id: "prod-1" }] }))
      .mockResolvedValueOnce(jsonResponse(200, { data: { id: "prod-1" } }))
      .mockResolvedValueOnce(jsonResponse(202, { data: { id: "prod-1", status: "queued" } }))
      .mockResolvedValueOnce(jsonResponse(201, { data: { condition: "drops" } }));

    const api = new Pricesaurus({ token: "ps_live_test", fetch: fetchMock });
    const url = "https://shop.example.test/p";

    await expect(api.watch({ url, name: "Kettle" })).resolves.toMatchObject({
      data: { id: "prod-1" },
    });
    await api.products();
    await api.products({ per_page: 2 });
    await api.products({ starting_after: "prod-1", per_page: 2 });
    await api.product("prod-1");
    await api.check("prod-1");
    await api.alert("prod-1", { condition: "drops" });

    const urls = fetchMock.mock.calls.map((call) => call[0] as string);
    expect(urls).toEqual([
      "https://pricesaurus.com/api/v1/products",
      "https://pricesaurus.com/api/v1/products",
      "https://pricesaurus.com/api/v1/products?per_page=2",
      "https://pricesaurus.com/api/v1/products?per_page=2&starting_after=prod-1",
      "https://pricesaurus.com/api/v1/products/prod-1",
      "https://pricesaurus.com/api/v1/products/prod-1/checks",
      "https://pricesaurus.com/api/v1/products/prod-1/alerts",
    ]);
  });

  it("throws a typed error on 401", async () => {
    const api = new Pricesaurus({
      token: "bad",
      fetch: vi.fn().mockResolvedValue(
        jsonResponse(401, {
          error: { code: "unauthenticated", message: "Send a token.", retryable: false },
        }),
      ),
    });

    await expect(api.me()).rejects.toMatchObject({
      name: "PricesaurusError",
      status: 401,
      code: "unauthenticated",
      retryable: false,
    });
  });

  it("reads retryable from the error body and falls back when the shape is thin", async () => {
    const retryable = new Pricesaurus({
      token: "tok",
      fetch: vi
        .fn()
        .mockResolvedValue(
          jsonResponse(503, { error: { code: "upstream", message: "busy", retryable: true } }),
        ),
    });
    await expect(retryable.me()).rejects.toMatchObject({ retryable: true, code: "upstream" });

    const noEnvelope = new Pricesaurus({
      token: "tok",
      fetch: vi.fn().mockResolvedValue(jsonResponse(500, { nope: true })),
    });
    await expect(noEnvelope.me()).rejects.toMatchObject({ code: "http_error" });

    const nullPayload = new Pricesaurus({
      token: "tok",
      fetch: vi.fn().mockResolvedValue(jsonResponse(500, null)),
    });
    await expect(nullPayload.me()).rejects.toMatchObject({ code: "http_error" });

    const stringError = new Pricesaurus({
      token: "tok",
      fetch: vi.fn().mockResolvedValue(jsonResponse(500, { error: "boom" })),
    });
    await expect(stringError.me()).rejects.toMatchObject({ code: "http_error" });

    const emptyError = new Pricesaurus({
      token: "tok",
      fetch: vi.fn().mockResolvedValue(jsonResponse(500, { error: {} })),
    });
    await expect(emptyError.me()).rejects.toMatchObject({
      code: "http_error",
      message: "Request failed.",
    });
  });

  it("wraps a network failure", async () => {
    const asError = new Pricesaurus({
      token: "tok",
      fetch: vi.fn().mockRejectedValue(new Error("offline")),
    });
    await expect(asError.me()).rejects.toMatchObject({
      code: "network_error",
      message: "offline",
      retryable: true,
    });

    const asValue = new Pricesaurus({
      token: "tok",
      fetch: vi.fn().mockRejectedValue("nope"),
    });
    await expect(asValue.me()).rejects.toMatchObject({
      code: "network_error",
      message: "Network request failed.",
    });
  });

  it("rejects a non-JSON body", async () => {
    const api = new Pricesaurus({
      token: "tok",
      fetch: vi.fn().mockResolvedValue(brokenJsonResponse(200)),
    });

    await expect(api.me()).rejects.toMatchObject({ code: "invalid_json" });
  });

  it("re-exports the client from the package entry", () => {
    expect(FromIndex).toBe(Pricesaurus);
    expect(ErrorFromIndex).toBe(PricesaurusError);
  });
});
