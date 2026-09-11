import { Pricesaurus } from "./client.js";
import { PricesaurusError } from "./errors.js";

export const USAGE = `pricesaurus - Watch API CLI

Usage:
  pricesaurus extract <url>
  pricesaurus watch <url>
  pricesaurus me

Env:
  PRICESAURUS_TOKEN      developer Bearer token from /api-keys
  PRICESAURUS_BASE_URL   default https://pricesaurus.com/api/v1

Docs: https://pricesaurus.com/developers
`;

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
  const [command, url] = input.argv;

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
    const result = await dispatch(api, command, url);

    return { code: 0, stdout: `${JSON.stringify(result, null, 2)}\n`, stderr: "" };
  } catch (error) {
    if (error instanceof PricesaurusError) {
      return { code: 1, stdout: "", stderr: `${error.code}: ${error.message}\n` };
    }

    const message = error instanceof Error ? error.message : "Unknown error";

    return { code: 1, stdout: "", stderr: `${message}\n` };
  }
};

const dispatch = async (
  api: Pricesaurus,
  command: string,
  url: string | undefined,
): Promise<unknown> => {
  if (command === "me") {
    return api.me();
  }

  if (command === "extract") {
    if (url === undefined) {
      throw new PricesaurusError(0, "usage", "pricesaurus extract <url>");
    }

    return api.extract({ url });
  }

  if (command === "watch") {
    if (url === undefined) {
      throw new PricesaurusError(0, "usage", "pricesaurus watch <url>");
    }

    return api.watch({ url });
  }

  throw new PricesaurusError(0, "usage", USAGE.trimEnd());
};
