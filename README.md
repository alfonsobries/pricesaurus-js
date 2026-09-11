# Pricesaurus JS

[![CI](https://github.com/alfonsobries/pricesaurus-js/actions/workflows/ci.yml/badge.svg)](https://github.com/alfonsobries/pricesaurus-js/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/pricesaurus.svg)](https://www.npmjs.com/package/pricesaurus)
[![node](https://img.shields.io/node/v/pricesaurus.svg)](https://www.npmjs.com/package/pricesaurus)
[![license](https://img.shields.io/github/license/alfonsobries/pricesaurus-js.svg)](LICENSE)

Official Node.js SDK and CLI for the [Pricesaurus Watch API](https://pricesaurus.com/developers). Paste a product URL, read the price, watch it, set an alert.

Requires a [Plus or Max](https://pricesaurus.com/pricing) account and a Bearer token from [API keys](https://pricesaurus.com/api-keys).

## Install

```bash
pnpm add pricesaurus
```

```bash
npm install pricesaurus
```

Node 20 or later. ESM only.

## Usage

```ts
import { Pricesaurus, PricesaurusError } from "pricesaurus";

const api = new Pricesaurus({ token: process.env.PRICESAURUS_TOKEN ?? "" });

const snapshot = await api.extract({ url: "https://www.amazon.com/dp/B00CH9QWOU" });
const product = await api.watch({ url: "https://www.amazon.com/dp/B00CH9QWOU" });
const account = await api.me();
```

`baseUrl` defaults to `https://pricesaurus.com/api/v1`. Inject `fetch` in tests.

Mutating calls accept `{ idempotencyKey }` so a retry does not create a second product or alert.

## API

| Method                                               | HTTP                         |
| ---------------------------------------------------- | ---------------------------- |
| `extract({ url, country?, currency? })`              | `POST /extract`              |
| `watch({ url, name?, country?, currency? })`         | `POST /products`             |
| `products({ per_page?, starting_after? })`           | `GET /products`              |
| `product(id)`                                        | `GET /products/{id}`         |
| `check(id)`                                          | `POST /products/{id}/checks` |
| `alert(productId, { condition, threshold?, name? })` | `POST /products/{id}/alerts` |
| `me()`                                               | `GET /me`                    |

`condition` is `drops`, `below`, or `above`. Responses are `{ data, meta? }`. Types ship with the package.

OpenAPI: [pricesaurus.com/openapi.json](https://pricesaurus.com/openapi.json)

## Errors

Failed calls throw `PricesaurusError`:

| Field       | Meaning                                                                                |
| ----------- | -------------------------------------------------------------------------------------- |
| `status`    | HTTP status, or `0` when the request did not get a response                            |
| `code`      | API error code, or `network_error` / `invalid_url` / `invalid_json` / `invalid_config` |
| `message`   | Human-readable reason                                                                  |
| `retryable` | `true` when the client or the API says it is safe to retry                             |

```ts
try {
  await api.extract({ url });
} catch (error) {
  if (error instanceof PricesaurusError && error.retryable) {
    // retry
  }
  throw error;
}
```

## CLI

```bash
export PRICESAURUS_TOKEN=ps_live_...
pnpm exec pricesaurus extract https://www.amazon.com/dp/B00CH9QWOU
pnpm exec pricesaurus watch https://www.amazon.com/dp/B00CH9QWOU
pnpm exec pricesaurus me
```

```bash
pnpm dlx pricesaurus --help
```

`PRICESAURUS_BASE_URL` overrides the API origin (tests, a local app).

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
