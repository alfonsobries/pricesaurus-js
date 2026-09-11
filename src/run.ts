import { Pricesaurus } from "./client.js";
import { PricesaurusError } from "./errors.js";

export const USAGE = `pricesaurus - Watch API CLI

Usage:
  pricesaurus extract <url>
  pricesaurus watch <url>
  pricesaurus me
  pricesaurus products
  pricesaurus alerts <product-id>
  pricesaurus alert <product-id> <drops|below|above> [threshold]
  pricesaurus pause <alert-id>
  pricesaurus resume <alert-id>
  pricesaurus delete-alert <alert-id>

Env:
  PRICESAURUS_TOKEN      developer Bearer token from /api-keys
  PRICESAURUS_BASE_URL   default https://pricesaurus.com/api/v1

Docs: https://pricesaurus.com/developers
`;

const CONDITIONS = ["drops", "below", "above"] as const;

type Condition = (typeof CONDITIONS)[number];

export type RunInput = {
  argv: string[];
  env: NodeJS.Dict<string>;
  fetch?: typeof fetch;
};

export type RunResult = {
  code: number;
  stdout: string;
  stderr: string;
};

export const run = async (input: RunInput): Promise<RunResult> => {
  const [command, ...args] = input.argv;

  if (command === undefined || command === "--help" || command === "-h") {
    return {
      code: command === undefined ? 1 : 0,
      stdout: USAGE,
      stderr: "",
    };
  }

  const token = (input.env.PRICESAURUS_TOKEN ?? "").trim();

  if (token === "") {
    return {
      code: 1,
      stdout: "",
      stderr: "Set PRICESAURUS_TOKEN to a developer token from https://pricesaurus.com/api-keys\n",
    };
  }

  const api = new Pricesaurus({
    token,
    baseUrl: input.env.PRICESAURUS_BASE_URL,
    fetch: input.fetch,
  });

  try {
    const result = await dispatch(api, command, args);

    return { code: 0, stdout: `${JSON.stringify(result, null, 2)}\n`, stderr: "" };
  } catch (error) {
    if (error instanceof PricesaurusError) {
      return { code: 1, stdout: "", stderr: `${error.code}: ${error.message}\n` };
    }

    const message = error instanceof Error ? error.message : "Unknown error";

    return { code: 1, stdout: "", stderr: `${message}\n` };
  }
};

const dispatch = async (api: Pricesaurus, command: string, args: string[]): Promise<unknown> => {
  if (command === "me") {
    return api.me();
  }

  if (command === "extract") {
    return api.extract({ url: requireArg(args[0], "pricesaurus extract <url>") });
  }

  if (command === "watch") {
    return api.watch({ url: requireArg(args[0], "pricesaurus watch <url>") });
  }

  if (command === "products") {
    return api.products();
  }

  if (command === "alerts") {
    return api.alerts(requireArg(args[0], "pricesaurus alerts <product-id>"));
  }

  if (command === "alert") {
    return createAlert(api, args);
  }

  if (command === "pause") {
    return api.updateAlert(requireArg(args[0], "pricesaurus pause <alert-id>"), {
      is_active: false,
    });
  }

  if (command === "resume") {
    return api.updateAlert(requireArg(args[0], "pricesaurus resume <alert-id>"), {
      is_active: true,
    });
  }

  if (command === "delete-alert") {
    await api.deleteAlert(requireArg(args[0], "pricesaurus delete-alert <alert-id>"));

    return { deleted: true };
  }

  throw new PricesaurusError(0, "usage", USAGE.trimEnd());
};

const createAlert = (api: Pricesaurus, args: string[]): Promise<unknown> => {
  const productId = args[0];
  const condition = args[1];
  const rawThreshold = args[2];

  if (productId === undefined || condition === undefined || !isCondition(condition)) {
    throw new PricesaurusError(
      0,
      "usage",
      "pricesaurus alert <product-id> <drops|below|above> [threshold]",
    );
  }

  if (condition === "drops") {
    return api.alert(productId, { condition });
  }

  const threshold = Number(rawThreshold);

  if (rawThreshold === undefined || !Number.isFinite(threshold)) {
    throw new PricesaurusError(
      0,
      "usage",
      "pricesaurus alert <product-id> below|above <threshold>",
    );
  }

  return api.alert(productId, { condition, threshold });
};

const requireArg = (value: string | undefined, usage: string): string => {
  if (value === undefined || value.trim() === "") {
    throw new PricesaurusError(0, "usage", usage);
  }

  return value;
};

const isCondition = (value: string): value is Condition =>
  (CONDITIONS as readonly string[]).includes(value);
