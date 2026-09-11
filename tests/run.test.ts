import { describe, expect, it, vi } from "vitest";
import { run, USAGE } from "../src/run.js";

const jsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("run", () => {
  it("prints usage when there is no command", async () => {
    const result = await run({ argv: [], env: {} });

    expect(result).toEqual({ code: 1, stdout: USAGE, stderr: "" });
  });

  it("prints usage for help flags", async () => {
    await expect(run({ argv: ["--help"], env: {} })).resolves.toMatchObject({
      code: 0,
      stdout: USAGE,
    });
    await expect(run({ argv: ["-h"], env: {} })).resolves.toMatchObject({ code: 0, stdout: USAGE });
  });

  it("requires a token", async () => {
    const missing = await run({ argv: ["me"], env: {} });
    expect(missing.code).toBe(1);
    expect(missing.stderr).toContain("PRICESAURUS_TOKEN");

    const blank = await run({ argv: ["me"], env: { PRICESAURUS_TOKEN: "  " } });
    expect(blank.code).toBe(1);
    expect(blank.stderr).toContain("PRICESAURUS_TOKEN");
  });

  it("runs me, extract, and watch", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { data: { plan: "plus" } }))
      .mockResolvedValueOnce(jsonResponse(200, { data: { name: "Kettle" } }))
      .mockResolvedValueOnce(jsonResponse(201, { data: { id: "prod-1" } }));

    const env = {
      PRICESAURUS_TOKEN: "ps_live_test",
      PRICESAURUS_BASE_URL: "https://example.test/api/v1",
    };

    const me = await run({ argv: ["me"], env, fetch: fetchMock });
    expect(me.code).toBe(0);
    expect(me.stdout).toContain('"plan": "plus"');

    const extract = await run({
      argv: ["extract", "https://shop.example.test/p"],
      env,
      fetch: fetchMock,
    });
    expect(extract.code).toBe(0);

    const watch = await run({
      argv: ["watch", "https://shop.example.test/p"],
      env,
      fetch: fetchMock,
    });
    expect(watch.code).toBe(0);
  });

  it("rejects extract and watch without a URL", async () => {
    const env = { PRICESAURUS_TOKEN: "ps_live_test" };

    await expect(run({ argv: ["extract"], env })).resolves.toMatchObject({
      code: 1,
      stderr: "usage: pricesaurus extract <url>\n",
    });
    await expect(run({ argv: ["watch"], env })).resolves.toMatchObject({
      code: 1,
      stderr: "usage: pricesaurus watch <url>\n",
    });
  });

  it("rejects an unknown command", async () => {
    const result = await run({ argv: ["dance"], env: { PRICESAURUS_TOKEN: "ps_live_test" } });

    expect(result.code).toBe(1);
    expect(result.stderr).toContain("Usage:");
  });

  it("prints API errors from the client", async () => {
    const result = await run({
      argv: ["me"],
      env: { PRICESAURUS_TOKEN: "ps_live_test" },
      fetch: vi
        .fn()
        .mockResolvedValue(
          jsonResponse(401, { error: { code: "unauthenticated", message: "nope" } }),
        ),
    });

    expect(result).toEqual({
      code: 1,
      stdout: "",
      stderr: "unauthenticated: nope\n",
    });
  });

  it("prints unexpected errors", async () => {
    const asError = await run({
      argv: ["me"],
      env: { PRICESAURUS_TOKEN: "ps_live_test" },
      fetch: vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            toJSON() {
              throw new Error("cycle");
            },
          },
        }),
      } as unknown as Response),
    });
    expect(asError.stderr).toBe("cycle\n");

    const asUnknown = await run({
      argv: ["me"],
      env: { PRICESAURUS_TOKEN: "ps_live_test" },
      fetch: vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            toJSON() {
              throw 1;
            },
          },
        }),
      } as unknown as Response),
    });
    expect(asUnknown.stderr).toBe("Unknown error\n");
  });
});
